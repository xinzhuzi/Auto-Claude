/**
 * 参数验证器 - Webview 客户端验证
 *
 * 用于根据 schema 约束验证 MCP 工具参数值
 *
 * 注意: 这是用于即时 UI 反馈的客户端验证器。
 */

/**
 * 工具参数类型
 */
export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

/**
 * 带验证元数据的扩展工具参数
 */
export interface ExtendedToolParameter extends ToolParameter {
  /** 允许的枚举值 (如果定义) */
  enum?: unknown[];
  /** 数字最小值 */
  minimum?: number;
  /** 数字最大值 */
  maximum?: number;
  /** 字符串最小长度 */
  minLength?: number;
  /** 字符串最大长度 */
  maxLength?: number;
  /** 字符串验证正则模式 */
  pattern?: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 根据 schema 约束验证参数值
 *
 * @param value - 要验证的值
 * @param param - 带约束的参数 schema
 * @returns 验证结果，无效时包含错误消息
 *
 * @example
 * ```typescript
 * const param = { name: 'region', type: 'string', enum: ['us-east-1', 'us-west-2'], required: true };
 * const result = validateParameterValue('us-east-1', param);
 * // { valid: true }
 * ```
 */
export function validateParameterValue(
  value: unknown,
  param: ExtendedToolParameter
): ValidationResult {
  // 检查必填约束
  if (param.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: '此字段为必填项' };
  }

  // 如果值为空且非必填，跳过验证
  if (!param.required && (value === undefined || value === null || value === '')) {
    return { valid: true };
  }

  // 按类型验证
  switch (param.type) {
    case 'string':
      return validateStringValue(value, param);
    case 'number':
    case 'integer':
      return validateNumberValue(value, param);
    case 'boolean':
      return validateBooleanValue(value);
    case 'array':
      return validateArrayValue(value);
    case 'object':
      return validateObjectValue(value);
    default:
      return { valid: true };
  }
}

/**
 * 验证字符串值
 */
function validateStringValue(value: unknown, param: ExtendedToolParameter): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: '值必须是字符串' };
  }

  // 检查枚举约束
  if (param.enum && !param.enum.includes(value)) {
    return { valid: false, error: `值必须是以下之一: ${param.enum.join(', ')}` };
  }

  // 检查最小长度约束
  if (param.minLength !== undefined && value.length < param.minLength) {
    return { valid: false, error: `最小长度为 ${param.minLength}` };
  }

  // 检查最大长度约束
  if (param.maxLength !== undefined && value.length > param.maxLength) {
    return { valid: false, error: `最大长度为 ${param.maxLength}` };
  }

  // 检查模式约束
  if (param.pattern) {
    const regex = new RegExp(param.pattern);
    if (!regex.test(value)) {
      return { valid: false, error: `值必须匹配模式: ${param.pattern}` };
    }
  }

  return { valid: true };
}

/**
 * 验证数字值
 */
function validateNumberValue(value: unknown, param: ExtendedToolParameter): ValidationResult {
  const num = Number(value);

  if (Number.isNaN(num)) {
    return { valid: false, error: '值必须是数字' };
  }

  // 检查整数约束
  if (param.type === 'integer' && !Number.isInteger(num)) {
    return { valid: false, error: '值必须是整数' };
  }

  // 检查最小值约束
  if (param.minimum !== undefined && num < param.minimum) {
    return { valid: false, error: `最小值为 ${param.minimum}` };
  }

  // 检查最大值约束
  if (param.maximum !== undefined && num > param.maximum) {
    return { valid: false, error: `最大值为 ${param.maximum}` };
  }

  return { valid: true };
}

/**
 * 验证布尔值
 */
function validateBooleanValue(value: unknown): ValidationResult {
  if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
    return { valid: false, error: '值必须是布尔值' };
  }

  return { valid: true };
}

/**
 * 验证数组值
 */
function validateArrayValue(value: unknown): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, error: '值必须是数组' };
  }

  return { valid: true };
}

/**
 * 验证对象值
 */
function validateObjectValue(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: '值必须是对象' };
  }

  return { valid: true };
}

/**
 * 验证参数映射中的所有参数
 *
 * @param parameterValues - 参数名到值的映射
 * @param parameters - 参数 schema 数组
 * @returns 参数名到验证错误的映射（全部有效时为空）
 *
 * @example
 * ```typescript
 * const errors = validateAllParameters(
 *   { region: 'us-east-1', limit: '10' },
 *   [
 *     { name: 'region', type: 'string', required: true },
 *     { name: 'limit', type: 'integer', required: false }
 *   ]
 * );
 * // {}
 * ```
 */
export function validateAllParameters(
  parameterValues: Record<string, unknown>,
  parameters: ExtendedToolParameter[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const param of parameters) {
    const value = parameterValues[param.name];
    const result = validateParameterValue(value, param);

    if (!result.valid && result.error) {
      errors[param.name] = result.error;
    }
  }

  return errors;
}
