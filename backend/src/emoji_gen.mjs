// run_check 适配层 — 供 harness 验证调用的入口
// 导出 generate 以匹配 run_check.mjs 的调用签名: emojiMod.generate(mockInput)

import { handleEmojiGen } from '../harness/emoji_gen/index.mjs';

export async function generate(input) {
  return handleEmojiGen(input);
}

export default { generate };
