// 输出格式化层 — 校验 output_schema 并包装标准输出
// 契约约束: format 恒为 "png", dimensions 恒为 512×512

const FIXED_FORMAT = 'png';
const FIXED_DIMENSIONS = { width: 512, height: 512 };

export function formatOutput(imageUrl, errorCode) {
  const success = imageUrl !== null && !errorCode;

  // 契约约束: success=false 时 error_code 必须存在
  const finalErrorCode = success ? null : (errorCode || 'UNKNOWN_ERROR');

  return {
    success:    success,
    image_url:  imageUrl,
    format:     FIXED_FORMAT,
    dimensions: FIXED_DIMENSIONS,
    error_code: finalErrorCode,
  };
}
