import fs from 'fs/promises';
import path from 'path';

export async function validateContract(contractPath, outputObj) {
  const raw = await fs.readFile(contractPath, 'utf8');
  const contract = JSON.parse(raw);
  const errors = [];

  // 枚举校验
  const styleMap = contract.input_schema?.style;
  if (styleMap && outputObj.input && !styleMap.includes(outputObj.input.style)) {
    errors.push(`style 偏离枚举: ${outputObj.input.style}`);
  }

  // 结构校验
  if (contract.output_schema) {
    for (const [key, spec] of Object.entries(contract.output_schema)) {
      if (!(key in outputObj)) errors.push(`缺失输出字段: ${key}`);
    }
  }

  // 约束匹配（简化版）
  contract.constraints?.forEach((rule, i) => {
    if (rule.includes("PNG") && outputObj.format !== "png") errors.push(`约束${i+1}失败: 格式非PNG`);
    if (rule.includes("512") && outputObj.dimensions?.width !== 512) errors.push(`约束${i+1}失败: 宽度非512`);
  });

  return { passed: errors.length === 0, errors };
}