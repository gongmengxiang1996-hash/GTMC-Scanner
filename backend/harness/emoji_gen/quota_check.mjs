// 配额/隐私拦截层 — 滑动窗口限流 + PII检测
// 所有数据仅在内存中，不落盘、不上传

const WINDOW_MS = 60_000;  // 60 秒滑动窗口
const MAX_REQUESTS = 10;   // 窗口内最大请求数

const quotaMap = new Map(); // <user_id, timestamp[]>

// PII 检测模式（手机号、身份证、邮箱）
const PII_PATTERNS = [
  /\b1[3-9]\d{9}\b/,                                    // 中国手机号
  /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/, // 18位身份证
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // 邮箱
];

function makeError(code) {
  return { success: false, error_code: code };
}

function checkQuota(userId) {
  const now = Date.now();
  if (!quotaMap.has(userId)) {
    quotaMap.set(userId, [now]);
    return true;
  }

  let timestamps = quotaMap.get(userId);
  // 滑动窗口裁剪
  timestamps = timestamps.filter(t => now - t < WINDOW_MS);
  quotaMap.set(userId, timestamps);

  if (timestamps.length >= MAX_REQUESTS) {
    return false;
  }
  timestamps.push(now);
  return true;
}

function checkPII(prompt) {
  return PII_PATTERNS.some(pattern => pattern.test(prompt));
}

export function quotaCheck(input) {
  if (!checkQuota(input.user_id)) {
    return makeError('QUOTA_EXCEEDED');
  }
  if (checkPII(input.prompt)) {
    return makeError('CONTENT_BLOCKED');
  }
  // 通过 — 不返回任何值（void）
}

// 仅用于测试/调试，不下发至生产日志
export function _resetQuotaMap() {
  quotaMap.clear();
}
