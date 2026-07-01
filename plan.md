# ai_emoji_generation — 实施计划

> 基于契约 `@contracts/ai_emoji_gen.json` v1.0.0

---

## 一、目标文件结构

```
backend/
├── harness/
│   ├── run_check.mjs          # 存量验证闸门（不改动）
│   ├── validator.mjs          # 存量校验器（不改动）
│   └── emoji_gen/             # ★ 本模块
│       ├── index.mjs          # 公共入口，串联校验→生成→输出
│       ├── validate_input.mjs # 输入校验层
│       ├── quota_check.mjs    # 配额/风控拦截层
│       ├── generate.mjs       # 核心生成层（模拟/真实AI调用）
│       └── format_output.mjs  # 输出格式校验与标准化
└── contracts/
    └── ai_emoji_gen.json      # 契约源（只读引用）
```

---

## 二、核心函数签名与输入输出类型

### 2.1 公共入口 — `index.mjs`

```ts
// 签名
export async function handleEmojiGen(rawInput: unknown): Promise<EmojiGenOutput>

// 调用链（仅组合，不包含业务逻辑）
// rawInput → validateInput → quotaCheck → generate → formatOutput → EmojiGenOutput
```

### 2.2 各层函数

```ts
// === validate_input.mjs ===
// 职责：校验 input_schema，不通过直接返回 error 结果
export function validateInput(raw: unknown): ValidatedInput | EmojiGenErrorResult
// ValidatedInput = { prompt: string; style: "cartoon"|"real_person"|"ink"|"pixel"; user_id: string }

// === quota_check.mjs ===
// 职责：基于 user_id 做配额限制与隐私拦截
export function quotaCheck(input: ValidatedInput): void | EmojiGenErrorResult
// 通过返回 void（放行），拦截返回 error 结果

// === generate.mjs ===
// 职责：调用 AI 生成 emoji，返回图片 URL
export async function generate(input: ValidatedInput): Promise<string | null>
// 返回 image_url (string) 或 null（生成失败）

// === format_output.mjs ===
// 职责：校验 output_schema（格式 PNG、尺寸 512×512），包装标准输出
export function formatOutput(imageUrl: string | null, errorCode?: string): EmojiGenOutput
```

### 2.3 类型定义（JSDoc + TS 注释）

```ts
type EmojiStyle = "cartoon" | "real_person" | "ink" | "pixel";

interface EmojiGenInput {
  prompt: string;
  style: EmojiStyle;
  user_id: string;
}

interface EmojiGenOutput {
  success: boolean;
  image_url: string | null;
  format: "png";
  dimensions: { width: 512; height: 512 };
  error_code: string | null;
}

interface EmojiGenErrorResult {
  success: false;
  error_code: string;
}
```

---

## 三、错误处理路径

| 阶段 | 错误场景 | error_code | 处理方式 |
|------|----------|------------|----------|
| validate_input | `rawInput` 非对象或为 null | `INVALID_INPUT_TYPE` | 直接返回 `{ success: false, error_code }`，不进入后续阶段 |
| validate_input | `prompt` 缺失或非 string | `MISSING_PROMPT` | 同上 |
| validate_input | `style` 不在枚举值范围内 | `INVALID_STYLE` | 同上 |
| validate_input | `user_id` 缺失或非 string | `MISSING_USER_ID` | 同上 |
| quota_check | `user_id` 触发频率限制（> N次/min） | `QUOTA_EXCEEDED` | 返回错误，不消耗生成配额 |
| quota_check | `prompt` 含敏感词/隐私泄露模式 | `CONTENT_BLOCKED` | 隐私拦截，不调用 AI |
| generate | AI 服务不可用 / 超时 | `AI_SERVICE_ERROR` | 返回 null image_url |
| generate | AI 返回非 PNG 或非 512×512 | `OUTPUT_FORMAT_ERROR` | 丢弃结果，返回错误 |
| format_output | `image_url` 为 null 且无 `error_code` | `UNKNOWN_ERROR` | 兜底错误码 |

**全局约束（来自契约）**：
- `success === false` 时 `error_code` **必须非 null**
- 输出格式**必须**为 `{ format: "png", dimensions: { width: 512, height: 512 } }`，即使 success=false

---

## 四、隐私/配额拦截逻辑

### 4.1 配额限制（quota_check 第一阶段）

```
规则：
- 按 user_id 聚合，滑动窗口 60 秒内最多 10 次请求
- 存储：内存 Map<user_id, timestamp[]>，不落盘、不上传
- 超限返回 error_code: "QUOTA_EXCEEDED"
```

### 4.2 隐私拦截（quota_check 第二阶段）

```
规则（遵循 CLAUDE.md Privacy Guard）：
- prompt 中检测到手机号、身份证号、邮箱等 PII 模式 → 拦截
- 拦截返回 error_code: "CONTENT_BLOCKED"
- 绝对禁止：将 user_id 或 prompt 写入日志文件、发送到外部 telemetry/analytics 服务
- 不记录任何可关联到具体 user_id 的持久化审计日志
```

### 4.3 与本模块无关的禁止项

| 禁止行为 | 依据 |
|----------|------|
| `upload` / `cloud.sync` 调用 | CLAUDE.md Privacy Guard |
| `telemetry` / `analytics` 埋点 | CLAUDE.md Privacy Guard |
| 将 prompt 或 image_url 写入磁盘缓存 | 隐私最小化原则 |
| 绕过 quota_check 直接调用 generate | 契约输入校验约束 |

---

## 五、调用流程

```
handleEmojiGen(rawInput)
  │
  ├─ 1. validateInput(rawInput)
  │     ├─ 失败 → return { success: false, error_code, ...output_schema }
  │     └─ 通过 → ValidatedInput
  │
  ├─ 2. quotaCheck(ValidatedInput)
  │     ├─ 拦截 → return { success: false, error_code, ...output_schema }
  │     └─ 通过 → void
  │
  ├─ 3. generate(ValidatedInput)
  │     ├─ 失败/超时 → imageUrl = null, errorCode = "AI_SERVICE_ERROR"
  │     └─ 成功 → imageUrl = "https://..."
  │
  └─ 4. formatOutput(imageUrl, errorCode)
        └─ return EmojiGenOutput（含固定 format + dimensions）
```

---

## 六、不写入范围

- **不写入**：任何 `.js` / `.mjs` / `.ts` 代码文件
- **不写入**：任何 `package.json` / `node_modules` / 配置文件
- **不执行**：任何 `node` 命令或测试脚本
- 本 `plan.md` 仅规划文本，等待用户明确回复 **"计划已批准"** 后方可写入代码文件

---

## 七、与现有 harness 的关系

现有 `backend/harness/` 中的 `run_check.mjs` 和 `validator.mjs` 保持不变。本模块放入 `backend/harness/emoji_gen/` 子目录，不影响存量的验证流程。`run_check.mjs` 作为验证闸门，将按 CLAUDE.md 规则由用户在终端手动执行。
