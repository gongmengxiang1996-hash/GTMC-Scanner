// 核心生成层 — 调用 AI 服务生成 emoji 图片
// 当前为 mock 实现，生产环境替换为真实 AI API 调用

const AI_SERVICE_TIMEOUT_MS = 10_000;

// 各风格对应的占位图片（512×512 PNG）
const STYLE_PLACEHOLDERS = {
  cartoon:     'https://placehold.co/512x512/png?text=Cartoon+Emoji',
  real_person: 'https://placehold.co/512x512/png?text=Real+Person+Emoji',
  ink:         'https://placehold.co/512x512/png?text=Ink+Emoji',
  pixel:       'https://placehold.co/512x512/png?text=Pixel+Emoji',
};

async function callAIService(prompt, style) {
  // TODO: 生产环境替换为真实 AI API 调用
  // 此处 mock 模拟：延迟后返回对应风格的占位 URL
  const delay = Math.floor(Math.random() * 300) + 50; // 50-350ms
  await new Promise(resolve => setTimeout(resolve, delay));

  // 模拟偶发失败（~5% 概率）
  if (Math.random() < 0.05) {
    return null;
  }

  return STYLE_PLACEHOLDERS[style] || STYLE_PLACEHOLDERS.cartoon;
}

export async function generate(input) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI_SERVICE_TIMEOUT')), AI_SERVICE_TIMEOUT_MS)
  );

  try {
    const imageUrl = await Promise.race([
      callAIService(input.prompt, input.style),
      timeoutPromise,
    ]);
    return imageUrl;
  } catch {
    return null;
  }
}
