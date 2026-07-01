// 公共入口 — 串联校验→配额→生成→格式化
// 契约 @contracts/ai_emoji_gen.json v1.0.0

import { validateInput } from './validate_input.mjs';
import { quotaCheck }   from './quota_check.mjs';
import { generate }     from './generate.mjs';
import { formatOutput } from './format_output.mjs';

export { validateInput, quotaCheck, generate, formatOutput };

export async function handleEmojiGen(rawInput) {
  // 1. 输入校验
  const validated = validateInput(rawInput);
  if (validated.error_code) {
    return formatOutput(null, validated.error_code);
  }

  // 2. 配额/隐私拦截
  const quotaResult = quotaCheck(validated);
  if (quotaResult) {
    return formatOutput(null, quotaResult.error_code);
  }

  // 3. 调用生成
  const imageUrl = await generate(validated);

  // 4. 格式化输出
  const errorCode = imageUrl ? null : 'AI_SERVICE_ERROR';
  return formatOutput(imageUrl, errorCode);
}
