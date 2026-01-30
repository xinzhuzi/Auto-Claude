/**
 * 复选框组件
 *
 * 主题兼容的复选框组件。
 * 使用 CSS 变量实现跨主题的一致样式。
 */

import type React from 'react';

interface CheckboxProps {
  /** 复选框是否选中 */
  checked: boolean;
  /** 状态变化时的回调 */
  onChange: (checked: boolean) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 显示在复选框旁边的标签文本 */
  label?: string;
  /** 可选的无障碍标签 */
  ariaLabel?: string;
}

/**
 * 主题样式复选框组件
 *
 * 提供与主题颜色匹配的自定义复选框。
 * 使用 CSS 变量实现主题兼容（浅色/深色模式）。
 */
export function Checkbox({ checked, onChange, disabled = false, label, ariaLabel }: CheckboxProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: '11px',
        color: 'var(--foreground)',
        userSelect: 'none',
      }}
    >
      <div
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '3px',
          border: `1px solid ${
            disabled
              ? 'var(--input-border)'
              : checked
                ? 'var(--focus-border)'
                : 'var(--input-border)'
          }`,
          backgroundColor: checked
            ? 'var(--input-option-active-background)'
            : 'var(--input-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              color: 'var(--input-option-active-foreground)',
            }}
            aria-hidden="true"
          >
            <title>选中</title>
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && <span>{label}</span>}
    </div>
  );
}
