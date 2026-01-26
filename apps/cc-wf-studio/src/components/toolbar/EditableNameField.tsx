/**
 * EditableNameField Component
 *
 * 可编辑的工作流名称输入框
 * 适配Auto-Claude的Tailwind CSS样式系统
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@frontend/src/renderer/components/ui/input';

interface EditableNameFieldProps {
  /** 当前值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 验证错误消息 */
  error?: string | null;
  /** 最小宽度 */
  minWidth?: string;
}

export const EditableNameField: React.FC<EditableNameFieldProps> = ({
  value,
  onChange,
  placeholder = 'workflow-name',
  disabled = false,
  error = null,
  minWidth = '200px',
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // 同步外部value变化
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // 验证工作流名称格式：只允许小写字母、数字、连字符、下划线
  const WORKFLOW_NAME_PATTERN = /^[a-z0-9_-]*$/;

  const handleChange = useCallback(
    (newValue: string) => {
      if (WORKFLOW_NAME_PATTERN.test(newValue)) {
        setLocalValue(newValue);
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter或Escape完成编辑
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.currentTarget.blur();
    }
  }, []);

  return (
    <div style={{ minWidth }} className="flex flex-col flex-1">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {/* 错误提示 */}
        {error && (
          <div className="absolute -bottom-5 left-0 text-xs text-destructive whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
