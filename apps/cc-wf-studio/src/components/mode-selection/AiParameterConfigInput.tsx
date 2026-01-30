/**
 * AI 参数配置输入组件
 *
 * 用于在 AI 参数配置模式下输入参数描述的文本区域
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDebouncedValidation,
  validateParameterDescription,
} from '../../utils/natural-language-validator';

interface AiParameterConfigInputProps {
  value: string;
  onChange: (value: string) => void;
  showValidation?: boolean;
}

/**
 * AI 参数配置输入组件
 *
 * 用于在 AI 参数配置模式下输入自然语言参数描述的文本区域输入框。
 *
 * 包含实时验证和防抖（300ms 延迟）。
 * 验证: 必填输入（trim 后 ≥1 字符）。
 *
 * @param props - 组件属性
 * @param props.value - 当前参数描述值
 * @param props.onChange - 值变化时的回调
 * @param props.showValidation - 是否显示验证错误（默认: false）
 */
export function AiParameterConfigInput({
  value,
  onChange,
  showValidation = false,
}: AiParameterConfigInputProps) {
  const { t } = useTranslation('ccwfstudio');
  const [isFocused, setIsFocused] = useState(false);

  // 实时防抖验证（300ms 延迟）
  const debouncedError = useDebouncedValidation(value, validateParameterDescription, 300);

  // 确定是否应显示错误
  const showError = showValidation && debouncedError !== null;
  const errorMessage = debouncedError ? t(debouncedError, '此字段为必填项') : '';

  return (
    <div>
      {/* 标签 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <label
          htmlFor="nl-param-input"
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: 'var(--foreground)',
          }}
        >
          {t('mcp.naturalLanguage.paramDescription.label', '参数描述')}
        </label>
      </div>

      {/* 文本区域 */}
      <textarea
        id="nl-param-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('mcp.naturalLanguage.paramDescription.placeholder', '描述您希望如何配置参数...')}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '12px',
          fontSize: '13px',
          fontFamily: 'inherit',
          color: 'var(--input-foreground)',
          backgroundColor: 'var(--input-background)',
          border: `1px solid ${
            showError
              ? 'var(--input-validation-error-border)'
              : isFocused
                ? 'var(--focus-border)'
                : 'var(--input-border)'
          }`,
          borderRadius: '4px',
          resize: 'vertical',
          outline: 'none',
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {/* 错误消息 */}
      {showError && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: 'var(--error-foreground)',
            backgroundColor: 'var(--input-validation-error-background)',
            border: '1px solid var(--input-validation-error-border)',
            borderRadius: '4px',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
