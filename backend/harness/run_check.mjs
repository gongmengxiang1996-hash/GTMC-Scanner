import path from 'path';
import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import { validateContract } from './validator.mjs';

// 动态加载 Trae 生成的模块（安全封装）
async function loadModule(filePath) {
  try {
    const absPath = path.resolve(filePath);
    const fileUrl = pathToFileURL(absPath).href;
    const mod = await import(fileUrl);
    return mod.default || mod;
  } catch (e) {
    console.error(`loadModule 错误 (${filePath}):`, e.message);
    return null;
  }
}

(async () => {
  console.log('🔍 开始 Harness 验证...');
  
  // 1. 验证表情包生成模块契约
  const emojiMod = await loadModule('../src/emoji_gen.mjs');
  if (!emojiMod) {
    console.error('❌ 模块文件不存在，跳过验证。请确保 Trae 已生成对应文件。');
    return;
  }

  // 调用实际导出函数（若 Trae 生成签名不符，此处会抛错）
  try {
    const mockInput = { prompt: 'test', style: 'cartoon', user_id: 'u1' };
    const result = await emojiMod.generate(mockInput);
    const check = await validateContract('../../contracts/ai_emoji_gen.json', { ...result, input: mockInput });
    check.passed ? console.log('✅ 契约验证通过') : console.error('❌ 契约偏离:', check.errors);
  } catch (e) {
    console.error('❌ 运行时偏离: 函数签名或导出结构不符契约', e.message);
  }

  // 2. 隐私静态扫描（安全底线）
  try {
    const code = await fs.readFile('../src/vocab_memory.mjs', 'utf8');
    const forbidden = ['upload', 'cloud', 'telemetry', 'analytics', 'wx.cloud'];
    const hits = forbidden.filter(k => code.includes(k));
    hits.length ? console.error(`❌ 隐私拦截失败: 检测到 [${hits.join(',')}]`) : console.log('✅ 隐私合规通过');
  } catch {
    console.log('⚠️ 词库模块未生成，跳过隐私扫描');
  }
})();