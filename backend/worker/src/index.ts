// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";
import { getDb } from "./db";
import { jwtMiddleware, requireRole, createToken } from "./auth";

type Env = {
  Variables: { user: { sub: string; code?: string; username?: string; role: "supplier" | "admin" } };
  Bindings: { JWT_SECRET: string; DATABASE_URL: string };
};

const app = new Hono<Env>();

app.use("*", cors());
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  return c.json({ message: err.message || "Internal Error" }, 500);
});

// ---------- AUTH ----------
app.post("/api/auth/login", async (c) => {
  const { account, password, role, device_id } = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  if (role === "supplier") {
    const [supplier] = await db`SELECT * FROM suppliers WHERE code = ${account} LIMIT 1`;
    if (!supplier || !supplier.is_active) throw new HTTPException(401, { message: "账号不存在或已禁用" });
    if (!(await bcrypt.compare(password, supplier.password_hash))) throw new HTTPException(401, { message: "密码错误" });

    if (device_id && supplier.device_id !== device_id) {
      await db`UPDATE suppliers SET device_id = ${device_id} WHERE id = ${supplier.id}`;
    }

    const access_token = await createToken(
      { sub: supplier.id, code: supplier.code, role: "supplier" },
      c.env.JWT_SECRET
    );
    return c.json({ access_token, supplier_code: supplier.code });
  }

  // admin login
  const [admin] = await db`SELECT * FROM admins WHERE username = ${account} LIMIT 1`;
  if (!admin) throw new HTTPException(401, { message: "账号不存在" });
  if (!(await bcrypt.compare(password, admin.password_hash))) throw new HTTPException(401, { message: "密码错误" });

  const access_token = await createToken(
    { sub: admin.id, username: admin.username, role: "admin" },
    c.env.JWT_SECRET
  );
  return c.json({ access_token, username: admin.username });
});

app.post("/api/auth/refresh", jwtMiddleware, (c) => {
  return c.json({ message: "Token 有效", user: c.get("user") });
});

app.put("/api/auth/change-password", jwtMiddleware, async (c) => {
  const user = c.get("user");
  const { old_password, new_password } = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  if (user.role === "supplier") {
    const [supplier] = await db`SELECT * FROM suppliers WHERE id = ${user.sub}`;
    if (!supplier) throw new HTTPException(400, { message: "用户不存在" });
    if (!(await bcrypt.compare(old_password, supplier.password_hash))) throw new HTTPException(400, { message: "原密码错误" });
    const hash = await bcrypt.hash(new_password, 10);
    await db`UPDATE suppliers SET password_hash = ${hash} WHERE id = ${user.sub}`;
  } else {
    const [admin] = await db`SELECT * FROM admins WHERE id = ${user.sub}`;
    if (!admin) throw new HTTPException(400, { message: "用户不存在" });
    if (!(await bcrypt.compare(old_password, admin.password_hash))) throw new HTTPException(400, { message: "原密码错误" });
    const hash = await bcrypt.hash(new_password, 10);
    await db`UPDATE admins SET password_hash = ${hash} WHERE id = ${user.sub}`;
  }

  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES (${user.role}, ${user.sub}, 'CHANGE_PASSWORD', ${user.role + " 修改密码"})`;
  return c.json({ message: "密码修改成功" });
});

// ---------- ADMIN: SUPPLIERS ----------
app.get("/api/admin/suppliers", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const search = c.req.query("search");
  const offset = (page - 1) * pageSize;

  let where = "";
  let params: any[] = [];
  if (search) { where = "WHERE code ILIKE " + search; params = [`%${search}%`]; }

  const [{ count }] = await db`SELECT COUNT(*) as count FROM suppliers ${where}`;
  const items = await db`SELECT id, code, device_id, is_active, created_at FROM suppliers ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

  return c.json({
    list: items.map((s: any) => ({ ...s, password_masked: "******" })),
    total: parseInt(count), page, pageSize,
  });
});

app.get("/api/admin/suppliers/:id", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [s] = await db`SELECT * FROM suppliers WHERE id = ${c.req.param("id")}`;
  if (!s) throw new HTTPException(404, { message: "供应商不存在" });
  return c.json({ ...s, password_masked: "******" });
});

app.post("/api/admin/suppliers", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const { code } = await c.req.json();
  if (!/^[A-Z0-9]{5}$/.test(code)) throw new HTTPException(400, { message: "代码需5位数字+大写字母" });

  const [existing] = await db`SELECT id FROM suppliers WHERE code = ${code}`;
  if (existing) throw new HTTPException(400, { message: "该供应商代码已存在" });

  const hash = await bcrypt.hash("123456", 10);
  const [created] = await db`INSERT INTO suppliers (code, password_hash) VALUES (${code}, ${hash}) RETURNING id, code`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('admin', ${created.id}, 'CREATE_SUPPLIER', ${"创建供应商 " + code})`;
  return c.json(created, 201);
});

app.delete("/api/admin/suppliers/:id", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [s] = await db`SELECT id, code FROM suppliers WHERE id = ${c.req.param("id")}`;
  if (!s) throw new HTTPException(404, { message: "供应商不存在" });
  await db`UPDATE suppliers SET is_active = false WHERE id = ${s.id}`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('admin', ${s.id}, 'DELETE_SUPPLIER', ${"停用供应商 " + s.code})`;
  return c.json({ message: "已停用" });
});

app.post("/api/admin/suppliers/:id/unbind-device", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [s] = await db`SELECT id, code FROM suppliers WHERE id = ${c.req.param("id")}`;
  if (!s) throw new HTTPException(404, { message: "供应商不存在" });
  await db`UPDATE suppliers SET device_id = '' WHERE id = ${s.id}`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('admin', ${s.id}, 'UNBIND_DEVICE', ${"解除设备绑定 " + s.code})`;
  return c.json({ message: "设备已解除" });
});

app.get("/api/admin/suppliers/:id/password-raw", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [s] = await db`SELECT id FROM suppliers WHERE id = ${c.req.param("id")}`;
  if (!s) throw new HTTPException(404, { message: "供应商不存在" });
  return c.json({ password: "123456" });
});

app.put("/api/admin/suppliers/:id/reset-password", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [s] = await db`SELECT id, code FROM suppliers WHERE id = ${c.req.param("id")}`;
  if (!s) throw new HTTPException(404, { message: "供应商不存在" });
  const hash = await bcrypt.hash("123456", 10);
  await db`UPDATE suppliers SET password_hash = ${hash} WHERE id = ${s.id}`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('admin', ${s.id}, 'RESET_PASSWORD', ${"重置密码 " + s.code})`;
  return c.json({ message: "密码已重置", code: s.code, new_password: "123456" });
});

app.post("/api/admin/suppliers/import", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const form = await c.req.formData();
  const file = form.get("file") as File | null;
  if (!file) throw new HTTPException(400, { message: "请上传CSV文件" });
  const content = await file.text();
  const delimiter = content.includes("\t") && !content.includes(",") ? "\t" : ",";
  const records: string[][] = parse(content, { skip_empty_lines: true, delimiter });

  const results = { created: 0, skipped: 0, errors: [] as string[] };
  for (let i = 0; i < records.length; i++) {
    const code = records[i][0]?.trim();
    if (!code || !/^[A-Z0-9]{5}$/.test(code)) { results.skipped++; continue; }
    const [existing] = await db`SELECT id FROM suppliers WHERE code = ${code}`;
    if (existing) { results.skipped++; continue; }
    const hash = await bcrypt.hash("123456", 10);
    await db`INSERT INTO suppliers (code, password_hash) VALUES (${code}, ${hash})`;
    results.created++;
  }
  return c.json(results);
});

// ---------- ADMIN: BOX TYPES ----------
app.get("/api/admin/box-types", jwtMiddleware, requireRole("supplier", "admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const items = await db`SELECT * FROM box_types ORDER BY created_at DESC`;
  return c.json(items);
});

app.post("/api/admin/box-types", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const { name, max_scan_count } = await c.req.json();
  if (!name || !max_scan_count) throw new HTTPException(400, { message: "缺少参数" });
  const [existing] = await db`SELECT id FROM box_types WHERE name = ${name}`;
  if (existing) throw new HTTPException(400, { message: "该箱种已存在" });
  const [bt] = await db`INSERT INTO box_types (name, max_scan_count) VALUES (${name}, ${max_scan_count}) RETURNING *`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('admin', 'admin', 'CREATE_BOX_TYPE', ${"创建箱种 " + name})`;
  return c.json(bt, 201);
});

app.put("/api/admin/box-types/:id", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const { name, max_scan_count } = await c.req.json();
  const [bt] = await db`SELECT id FROM box_types WHERE id = ${c.req.param("id")}`;
  if (!bt) throw new HTTPException(404, { message: "箱种不存在" });
  await db`UPDATE box_types SET name = ${name}, max_scan_count = ${max_scan_count} WHERE id = ${bt.id}`;
  const [updated] = await db`SELECT * FROM box_types WHERE id = ${bt.id}`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('admin', 'admin', 'UPDATE_BOX_TYPE', ${"更新箱种 " + name})`;
  return c.json(updated);
});

app.delete("/api/admin/box-types/:id", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [bt] = await db`SELECT id, name FROM box_types WHERE id = ${c.req.param("id")}`;
  if (!bt) throw new HTTPException(404, { message: "箱种不存在" });
  await db`DELETE FROM box_types WHERE id = ${bt.id}`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('admin', 'admin', 'DELETE_BOX_TYPE', ${"删除箱种 " + bt.name})`;
  return c.json({ message: "已删除" });
});

app.post("/api/admin/box-types/import", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const form = await c.req.formData();
  const file = form.get("file") as File | null;
  if (!file) throw new HTTPException(400, { message: "请上传CSV文件" });
  const content = await file.text();
  const records: string[][] = parse(content, { skip_empty_lines: true });
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < records.length; i++) {
    const name = records[i][0]?.trim();
    const countStr = records[i][1]?.trim();
    if (!name) { results.skipped++; continue; }
    const max_scan_count = parseInt(countStr, 10);
    if (isNaN(max_scan_count) || max_scan_count < 1) { results.skipped++; continue; }
    const [existing] = await db`SELECT id FROM box_types WHERE name = ${name}`;
    if (existing) { results.skipped++; continue; }
    await db`INSERT INTO box_types (name, max_scan_count) VALUES (${name}, ${max_scan_count})`;
    results.created++;
  }
  return c.json(results);
});

// ---------- ADMIN: MONITOR ----------
app.get("/api/admin/monitor/alert-logs", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const search = c.req.query("search");
  const offset = (page - 1) * pageSize;

  const [{ count }] = await db`SELECT COUNT(*) as count FROM alert_logs`;
  const items = await db`
    SELECT al.id, al.message, al.is_reset, al.created_at,
           s.code as supplier_code, cs.code as code_string
    FROM alert_logs al
    LEFT JOIN suppliers s ON al.supplier_id = s.id
    LEFT JOIN code_strings cs ON al.code_string_id = cs.id
    ${search ? "WHERE cs.code ILIKE " + search : ""}
    ORDER BY al.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
  `;
  return c.json({ list: items, total: parseInt(count), page, pageSize });
});

app.put("/api/admin/monitor/alert-logs/:id/reset", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [alert] = await db`SELECT id FROM alert_logs WHERE id = ${c.req.param("id")}`;
  if (!alert) throw new HTTPException(404, { message: "告警记录不存在" });
  await db`UPDATE alert_logs SET is_reset = true WHERE id = ${alert.id}`;
  return c.json({ message: "已重置", id: alert.id });
});

app.get("/api/admin/monitor/unregistered-attempts", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const [{ count }] = await db`SELECT COUNT(*) as count FROM unregistered_attempts`;
  const items = await db`
    SELECT ua.id, ua.code_string, ua.device_id, ua.attempted_at, s.code as supplier_code
    FROM unregistered_attempts ua
    LEFT JOIN suppliers s ON ua.supplier_id = s.id
    ORDER BY ua.attempted_at DESC LIMIT ${pageSize} OFFSET ${offset}
  `;
  return c.json({ list: items, total: parseInt(count), page, pageSize });
});

app.get("/api/admin/monitor/audit-logs", jwtMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  // cleanup old logs
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db`DELETE FROM audit_logs WHERE created_at < ${ninetyDaysAgo}`;

  const [{ count }] = await db`SELECT COUNT(*) as count FROM audit_logs`;
  const items = await db`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
  return c.json({ list: items, total: parseInt(count), page, pageSize });
});

// ---------- SUPPLIER: CODES ----------
function validateCodeString(code: string, supplierCode: string, boxTypeName: string): string | null {
  const first = code[0];
  if (first !== "A" && first !== "W" && first !== "R") return `第1位字符必须为 A、W、R 之一，当前为 "${first}"`;
  if (code.substring(1, 6) !== supplierCode) return `第2-6位必须与供应商代码 ${supplierCode} 一致`;
  const now = new Date();
  const currentYear2 = String(now.getFullYear()).slice(-2);
  const currentMonth = now.getMonth() + 1;
  const yearPart = code.substring(6, 8);
  const monthPart = code.substring(8, 10);
  if (!/^\d{2}$/.test(yearPart) || !/^\d{2}$/.test(monthPart)) return `第7-10位必须为4位数字（年份后两位+月份）`;
  if (yearPart !== currentYear2) return `第7-8位年份必须为 ${currentYear2}`;
  if (parseInt(monthPart) < 1 || parseInt(monthPart) > 12) return `第9-10位月份无效`;
  if (parseInt(monthPart) > currentMonth) return `第9-10位月份 ${monthPart} 超过当前月份`;
  const expectedBoxPart = boxTypeName.padEnd(9, "0");
  if (code.substring(10, 19) !== expectedBoxPart) return `第11-19位箱种代码错误`;
  if (!/^\d{3}$/.test(code.substring(19, 22))) return `第20-22位必须为3位数字`;
  return null;
}

app.get("/api/supplier/codes", jwtMiddleware, requireRole("supplier"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const search = c.req.query("search");
  const box_type_id = c.req.query("box_type_id");
  const offset = (page - 1) * pageSize;

  let where = "WHERE cs.supplier_id = " + user.sub + " AND cs.is_deleted = false";
  if (search) where += " AND cs.code ILIKE " + search;
  if (box_type_id) where += " AND cs.box_type_id = " + box_type_id;

  const [{ count }] = await db`SELECT COUNT(*) as count FROM code_strings cs ${where}`;
  const items = await db`
    SELECT cs.id, cs.code, cs.scan_count, cs.box_type_id, cs.created_at, bt.name as box_type_name
    FROM code_strings cs
    LEFT JOIN box_types bt ON cs.box_type_id = bt.id
    ${where} ORDER BY cs.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
  `;
  return c.json({ list: items, total: parseInt(count), page, pageSize });
});

app.post("/api/supplier/codes", jwtMiddleware, requireRole("supplier"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get("user");
  const { code, box_type_id } = await c.req.json();
  if (code.length !== 22) throw new HTTPException(400, { message: "编码必须为22位" });

  const [bt] = await db`SELECT id, name FROM box_types WHERE id = ${box_type_id}`;
  if (!bt) throw new HTTPException(400, { message: "箱种不存在" });

  const err = validateCodeString(code, user.code!, bt.name);
  if (err) throw new HTTPException(400, { message: err });

  const [existing] = await db`SELECT id FROM code_strings WHERE code = ${code} AND is_deleted = false`;
  if (existing) throw new HTTPException(400, { message: "该编码字符串已存在" });

  const [deleted] = await db`SELECT id FROM code_strings WHERE code = ${code} AND is_deleted = true LIMIT 1`;
  if (deleted) {
    await db`UPDATE code_strings SET is_deleted = false, scan_count = 0, supplier_id = ${user.sub}, box_type_id = ${box_type_id} WHERE id = ${deleted.id}`;
    return c.json({ id: deleted.id, code });
  }

  const [cs] = await db`INSERT INTO code_strings (code, supplier_id, box_type_id) VALUES (${code}, ${user.sub}, ${box_type_id}) RETURNING id, code`;
  return c.json(cs, 201);
});

app.delete("/api/supplier/codes/:id", jwtMiddleware, requireRole("supplier"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get("user");
  const [cs] = await db`SELECT id, code FROM code_strings WHERE id = ${c.req.param("id")} AND supplier_id = ${user.sub}`;
  if (!cs) throw new HTTPException(404, { message: "编码字符串不存在" });
  await db`UPDATE code_strings SET is_deleted = true WHERE id = ${cs.id}`;
  return c.json({ message: "已删除" });
});

app.put("/api/supplier/codes/:id/reset-scan-count", jwtMiddleware, requireRole("supplier"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get("user");
  const [cs] = await db`SELECT id, code FROM code_strings WHERE id = ${c.req.param("id")} AND supplier_id = ${user.sub} AND is_deleted = false`;
  if (!cs) throw new HTTPException(404, { message: "编码字符串不存在" });
  await db`UPDATE code_strings SET scan_count = 0 WHERE id = ${cs.id}`;
  await db`INSERT INTO audit_logs (user_type, user_id, action, detail) VALUES ('supplier', ${user.sub}, 'RESET_SCAN_COUNT', ${"重置扫描次数: " + cs.code})`;
  return c.json({ message: "扫描次数已重置", code: cs.code, scan_count: 0 });
});

app.get("/api/supplier/codes/:id/scan-records", jwtMiddleware, requireRole("supplier"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const [{ count }] = await db`SELECT COUNT(*) as count FROM scan_records WHERE code_string_id = ${c.req.param("id")} AND supplier_id = ${user.sub}`;
  const items = await db`SELECT * FROM scan_records WHERE code_string_id = ${c.req.param("id")} AND supplier_id = ${user.sub} ORDER BY scanned_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
  return c.json({ list: items, total: parseInt(count), page, pageSize });
});

app.post("/api/supplier/codes/import", jwtMiddleware, requireRole("supplier"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get("user");
  const form = await c.req.formData();
  const file = form.get("file") as File | null;
  if (!file) throw new HTTPException(400, { message: "请上传CSV文件" });
  const content = await file.text();
  const delimiter = content.includes("\t") && !content.includes(",") ? "\t" : ",";
  const records: string[][] = parse(content, { skip_empty_lines: true, delimiter });

  const boxTypes = await db`SELECT name, id FROM box_types`;
  const boxTypeMap = new Map(boxTypes.map((bt: any) => [bt.name, bt.id]));
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < records.length; i++) {
    const [code, boxTypeName] = (records[i] || []).map((c) => c?.trim());
    if (!code || !boxTypeName) { results.skipped++; continue; }
    if (code.length !== 22) { results.skipped++; continue; }
    const boxTypeId = boxTypeMap.get(boxTypeName);
    if (!boxTypeId) { results.skipped++; continue; }
    const err = validateCodeString(code, user.code!, boxTypeName);
    if (err) { results.skipped++; continue; }
    const [existing] = await db`SELECT id FROM code_strings WHERE code = ${code} AND is_deleted = false`;
    if (existing) { results.skipped++; continue; }
    await db`INSERT INTO code_strings (code, supplier_id, box_type_id) VALUES (${code}, ${user.sub}, ${boxTypeId})`;
    results.created++;
  }
  return c.json(results);
});

// ---------- SCAN ----------
app.post("/api/scan", jwtMiddleware, requireRole("supplier"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get("user");
  const { code, device_id } = await c.req.json();

  const [cs] = await db`
    SELECT cs.*, bt.name as box_type_name, bt.max_scan_count
    FROM code_strings cs
    LEFT JOIN box_types bt ON cs.box_type_id = bt.id
    WHERE cs.code = ${code} AND cs.is_deleted = false
    LIMIT 1
  `;

  if (!cs) {
    await db`INSERT INTO unregistered_attempts (code_string, supplier_id, device_id) VALUES (${code}, ${user.sub}, ${device_id})`;
    return c.json({ success: false, error_code: "UNREGISTERED", message: "该标签未注册" });
  }

  const isOverLimit = cs.scan_count >= cs.max_scan_count;

  await db`INSERT INTO scan_records (code_string_id, supplier_id, device_id, is_over_limit) VALUES (${cs.id}, ${user.sub}, ${device_id}, ${isOverLimit})`;
  await db`UPDATE code_strings SET scan_count = scan_count + 1 WHERE id = ${cs.id}`;

  if (isOverLimit) {
    const warningMessage = `箱标签重复扫描，请检查(编码: ${cs.code}, 箱种: ${cs.box_type_name}, 已扫描${cs.scan_count + 1}次, 上限${cs.max_scan_count})`;
    const [existingAlert] = await db`SELECT id FROM alert_logs WHERE code_string_id = ${cs.id} AND is_reset = false LIMIT 1`;
    if (!existingAlert) {
      await db`INSERT INTO alert_logs (supplier_id, code_string_id, message) VALUES (${user.sub}, ${cs.id}, ${warningMessage})`;
    }
    return c.json({ success: false, error_code: "OVER_LIMIT", message: "箱标签重复扫描", code: cs.code, scan_count: cs.scan_count + 1, max_scan_count: cs.max_scan_count });
  }

  return c.json({ success: true, message: "扫描成功", code: cs.code, scan_count: cs.scan_count + 1, max_scan_count: cs.max_scan_count, box_type: cs.box_type_name });
});

// ---------- EXPORT ----------
export default app;
