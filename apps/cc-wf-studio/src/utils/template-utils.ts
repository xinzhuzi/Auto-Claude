/**
 * 模板变量工具
 *
 * 提供 Mustache 格式占位符变量 ({{variableName}}) 的提取和替换功能。
 * 用于 Prompt 节点。
 */

/**
 * Mustache 格式变量模式: {{variableName}}
 *
 * - 变量名只允许字母数字和下划线
 * - 带全局标志支持多次匹配
 */
export const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * 从提示文本中提取占位符变量
 *
 * @param promptText - 要提取的提示文本
 * @returns 提取的变量名数组（无重复，按出现顺序）
 *
 * @example
 * ```typescript
 * extractVariables("Generate a {{language}} function that {{description}}")
 * // => ["language", "description"]
 *
 * extractVariables("Hello {{name}}! Welcome {{name}}!")
 * // => ["name"] (重复被移除)
 *
 * extractVariables("No variables here")
 * // => []
 * ```
 */
export function extractVariables(promptText: string): string[] {
  const matches = promptText.matchAll(VARIABLE_PATTERN);
  const variables = Array.from(matches, (m) => m[1]);

  // 移除重复同时保持顺序
  return [...new Set(variables)];
}

/**
 * 用实际值替换提示文本中的占位符变量
 *
 * @param promptText - 要替换的提示文本
 * @param values - 变量名和值的映射
 * @returns 变量被替换后的文本
 *
 * @remarks
 * - 找不到值的变量保持占位符原样
 * - 区分大小写
 *
 * @example
 * ```typescript
 * const template = "Generate a {{language}} function that {{description}}";
 * const values = {
 *   language: "TypeScript",
 *   description: "validates email addresses"
 * };
 *
 * substituteVariables(template, values)
 * // => "Generate a TypeScript function that validates email addresses"
 *
 * // 找不到值时
 * substituteVariables("Hello {{name}}", {})
 * // => "Hello {{name}}" (占位符保留)
 * ```
 */
export function substituteVariables(promptText: string, values: Record<string, string>): string {
  return promptText.replace(VARIABLE_PATTERN, (match, varName: string) => {
    // 值存在时替换，不存在时保持原占位符
    return values[varName] ?? match;
  });
}

/**
 * 检查提示文本是否包含未定义的变量
 *
 * @param promptText - 要检查的提示文本
 * @param values - 变量名和值的映射
 * @returns 未定义的变量名数组
 *
 * @example
 * ```typescript
 * const template = "Hello {{name}}, you are {{age}} years old";
 * const values = { name: "Alice" };
 *
 * getUndefinedVariables(template, values)
 * // => ["age"]
 * ```
 */
export function getUndefinedVariables(
  promptText: string,
  values: Record<string, string>
): string[] {
  const allVariables = extractVariables(promptText);
  return allVariables.filter((varName) => !(varName in values));
}

/**
 * 检查提示文本的变量是否完全定义
 *
 * @param promptText - 要检查的提示文本
 * @param values - 变量名和值的映射
 * @returns 所有变量都已定义时返回 true
 *
 * @example
 * ```typ* const template = "Hello {{name}}";
 *
 * isFullyDefined(template, { name: "Alice" })
 * // => true
 *
 * isFullyDefined(template, {})
 * // => false
 * ```
 */
export function isFullyDefined(promptText: string, values: Record<string, string>): boolean {
  return getUndefinedVariables(promptText, values).length === 0;
}
