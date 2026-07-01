# CONTEXT_SNAPSHOT — 供应商管理数据平台

## 1. 项目终极目标
为供应商管理工程师构建一个「移动端扫码 + 网页端管理」的数据管理工具，区分供应商和管理员两个角色。

## 2. 技术栈与关键依赖
- **后端**: NestJS + TypeORM + PostgreSQL + JWT + bcrypt + csv-parse + multer
- **网页端**: React 18 + Vite + Ant Design 5 + Zustand + Axios + React Router 6
- **移动端**: React Native 0.73 + react-native-vision-camera + react-native-torch + Zustand
- **部署**: Docker Compose (PostgreSQL 16 + backend)
- **API 端口**: 后端 3000, 网页端 5173
- **默认管理员**: `shengguan_guanliyuan` / `654321`
- **供应商初始密码**: `123456`

## 3. 已完成的模块及核心文件清单

### 后端 `backend/server/` (NestJS)
| 模块 | 文件 | 职责 |
|------|------|------|
| 数据库 | `src/database/*.entity.ts` (8张表) | suppliers, admins, box_types, code_strings, scan_records, alert_logs, unregistered_attempts, audit_logs |
| 认证 | `src/auth/auth.module.ts/service.ts/controller.ts` | JWT登录(区分供应商/管理员), 密码修改, 角色守卫, 设备UUID绑定拒绝逻辑 |
| 供应商管理 | `src/suppliers/suppliers.module.ts/service.ts/controller.ts` | 管理员端CRUD, CSV批量导入, 设备解绑, 密码脱敏+复制 |
| 箱种管理 | `src/box-types/box-types.module.ts/service.ts/controller.ts` | 管理员端CRUD, 扫描次数限制绑定 |
| 编码字符串 | `src/code-strings/code-strings.module.ts/service.ts/controller.ts` | 供应商端CRUD, CSV导入(含箱种名校验), 逻辑删除, 扫描明细查询 |
| 扫码 | `src/scan/scan.service.ts` | 扫码校验(未注册/超限), 扫描记录写入, 告警日志生成 |
| 监控 | `src/monitor/monitor.service.ts` | 告警日志/未注册尝试/审计日志查询, 审计日志90天自动清理 |
| Seed | `src/database/seed.ts` | 初始化管理员账号 `shengguan_guanliyuan` |

### 网页端 `web/` (React + Ant Design)
| 页面 | 文件 | 功能 |
|------|------|------|
| 登录页 | `src/pages/LoginPage.tsx` | 身份切换(Select), 账号密码登录, 密码修改入口 |
| 编码字符串管理 | `src/pages/supplier/CodeManagePage.tsx` | 表格(编码/扫描次数/箱种), 新增, CSV导入, 逻辑删除, 扫描记录弹窗 |
| 供应商管理 | `src/pages/admin/SupplierManagePage.tsx` | 表格(代码/密码脱敏/设备/状态), 新增, CSV导入, 设备解绑, 停用, 密码复制 |
| 箱种管理 | `src/pages/admin/BoxTypeManagePage.tsx` | 表格(名称/上限), 新增/编辑/删除 |
| 日志查看 | `src/pages/admin/LogViewPage.tsx` | 三个Tab: 超限告警/未注册标签/操作审计日志 |
| API层 | `src/services/api.ts` | Axios实例, JWT拦截器, 401自动跳转登录 |
| 状态管理 | `src/stores/authStore.ts` | Zustand管理用户/Token持久化 |

### 移动端 `mobile/` (React Native)
| 屏幕 | 文件 | 功能 |
|------|------|------|
| 登录 | `src/screens/LoginScreen.tsx` | 供应商代码+密码登录, 设备UUID采集, 密码修改 |
| 扫码 | `src/screens/ScanScreen.tsx` | 连续扫码, 手电筒强制开启/退出关闭, 震动反馈, 超限/未注册Alert |
| 个人中心 | `src/screens/ProfileScreen.tsx` | 查看信息/设备ID, 修改密码, 退出登录 |
| API层 | `src/services/api.ts` | DEV_SERVER_IP = `172.16.185.16`, AsyncStorage存Token |
| 设备ID | `src/utils/device.ts` | getDeviceId() |

### 已有Harness（emoji_gen, 独立于本平台）
- `backend/harness/emoji_gen/` — validate_input, quota_check, generate, format_output, index
- `backend/src/emoji_gen.mjs` — harness适配层
- `contracts/ai_emoji_gen.json`

## 4. 环境运行状态（2026-05-08）

### 当前运行的服务
| 服务 | 端口 | 状态 | 说明 |
|------|------|------|------|
| PostgreSQL 16.4 | 5433 | ✅ 运行中 | 免安装ZIP版 → `D:/PostgreSQL/16/`, 编码UTF8 |
| 后端 NestJS | 3000 | ✅ 运行中 | `nest start --watch`, 监听 `0.0.0.0:3000` |
| 网页端 Vite | 5173 | ✅ 运行中 | Vite proxy `/api` → `localhost:3000` |

### 数据库连接参数
- Host: localhost, Port: 5433, User: postgres, Pass: postgres, DB: supplier_platform
- 启动命令: `DB_HOST=localhost DB_PORT=5433 DB_USER=postgres DB_PASS=postgres DB_NAME=supplier_platform npm run start:dev`

### 已完成修复
- ✅ **管理员登录**: seed 执行成功, `shengguan_guanliyuan` / `654321` 可登录
- ✅ **LoginDto bug**: `device_id` 缺少 `@IsOptional()` + `@IsString()` 装饰器导致 ValidationPipe 拦截，已修复
- ✅ **数据库编码**: 重新 initdb `--encoding=UTF8`, 支持中文

### 已验证 API
- 管理员登录 → 箱种CRUD → 供应商CRUD → 供应商登录(含device_id) → 编码字符串 → 监控日志 — 全部通过

## 5. 已确认的注意事项/潜规则
- **PostgreSQL 端口**: 非标准 5433（5432 被 Windows 权限阻止），后端需显式设置 `DB_PORT=5433`
- **PostgreSQL 启动**: `postgres.exe -D D:/PostgreSQL/16/data -c listen_addresses=localhost -p 5433`
- **数据库编码**: 必须 `--encoding=UTF8`，默认 locale=C 会变成 SQL_ASCII 导致中文乱码
- **CLAUDE.md 宪法**: Plan-First（新模块先写plan.md）, Privacy Guard（禁止 upload/telemetry/analytics）, Verification Gate（不自动跑测试，等用户手动执行）
- **CLAUDE.md 位于 `.trae/CLAUDE.md`**（非项目根目录）
- **编码字符串**: 22位字母+数字混合, 必须先在网页端注册
- **箱种**: 管理员预设枚举, 每个箱种绑定一个扫描次数上限
- **供应商代码**: 5位数字+大写字母, 管理员创建
- **设备管控**: 首次登录绑定UUID, 新设备登录直接拒绝
- **密码策略**: >=6位, 无特殊字符, 忘记密码由管理员重置
- **超限告警**: 不做邮件/短信推送, 仅记录告警日志 + APP端提示
- **Windows环境**: PowerShell不支持 `&&` 链式语法, 文件路径用反斜杠但代码中统一用正斜杠
- **数据模型**: supplier.code为5位, code_string.code为22位, 均有UQ约束
- **部署IP**: 网页端通过Vite proxy到localhost:3000, 移动端手动设DEV_SERVER_IP

## 6. 下一步计划
1. ✅ **解决登录失败** — 已完成。安装 PostgreSQL 16 → 初始化 UTF8 数据库 → 执行 seed → 后端启动 → 登录成功
2. ✅ **网页端功能验证** — 已完成。箱种CRUD → 供应商CRUD → 供应商登录 → 编码字符串 → 日志查看 全部通过
3. 🔜 **接收用户上传的数据文件**: 供应商代码表CSV、字符串编码规则, 适配导入格式
4. 🔜 **手机端调试**: 用户在手机上安装运行APP, 实际扫码测试
5. 🔜 **根据用户反馈修复**: 界面调整、数据格式匹配、异常流程处理
