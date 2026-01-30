/**
 * 自然语言输入验证工具
 *
 * 用于验证 AI 参数配置和 AI 工具选择模式的自然语言输入
 */

import { useEffect, useState } from 'react';

/**
 * 验证自然语言参数描述
 *
 * 规则:
 * - 必填输入 (trim 后 ≥1 字符)
 *
 * @param description - 要验证的参数描述
 * @returns 错误消息 (i18n key) 或 null (有效时)
 */
export function validateParameterDescription(description: string): string | null {
  // 空值检查
  if (!description || description.trim().length === 0) {
    return 'mcp.error.paramDescRequired';
  }

  return null;
}

/**
 * 验证自然语言任务描述
 *
 * 规则:
 * - 必填输入 (trim 后 ≥1 字符)
 *
 * @param taskDescription - 要验证的任务描述
 * @returns 错误消息 (i18n key) 或 null (有效时)
 */
export function validateTaskDescription(taskDescription: string): string | null {
  // 空值检查
  if (!taskDescription || taskDescription.trim().length === 0) {
    return 'mcp.error.taskDescRequired';
  }

  return null;
}

/**
 * 防抖验证自定义 Hook
 *
 * 在指定延迟后验证输入值（防抖）。
 * 用于实时验证而不会过度重新渲染。
 *
 * @param value - 要验证的值
 * @param validationFn - 验证函数 (如 validateParameterDescription)
 * @param delay - 防抖延迟毫秒数 (默认: 300ms)
 * @returns 错误消息 (i18n key) 或 null (有效时)
 */
export function useDebouncedValidation(
  value: string,
  validationFn: (value: string) => string | null,
  delay: number = 300
): string | null {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 设置防抖定时器
    const timeoutId = setTimeout(() => {
      const validationError = validationFn(value);
      setError(validationError);
    }, delay);

    // 值变化或卸载时清理定时器
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, validationFn, delay]);

  return error;
}
