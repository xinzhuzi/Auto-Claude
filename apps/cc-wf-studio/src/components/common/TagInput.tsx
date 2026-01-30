/**
 * 标签输入组件
 *
 * 用于输入多个值作为标签的可复用标签输入组件。
 * 回车添加标签，× 删除，输入为空时退格删除最后一个标签。
 * 用于 Hooks 配置中的匹配器模式（如 "Bash"、"Edit"、"Write"）。
 */

import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface TagInputProps {
  /** 当前标签数组 */
  tags: string[];
  /** 标签变化时的回调 */
  onChange: (tags: string[]) => void;
  /** 输入框占位符文本 */
  placeholder?: string;
  /** 禁用输入 */
  disabled?: boolean;
  /** 为 React Flow 兼容性添加 nodrag 类 */
  className?: string;
}

/**
 * TagInput - 基于标签的输入组件
 *
 * 功能:
 * - 回车添加新标签
 * - × 按钮删除单个标签
 * - 输入为空时退格删除最后一个标签
 * - IME 组合支持（日文/中文/韩文输入）
 * - 防止重复
 * - 空白修剪
 */
export function TagInput({
  tags,
  onChange,
  placeholder = '输入后按回车',
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 防止重复
    if (tags.includes(trimmed)) {
      setInputValue('');
      return;
    }

    onChange([...tags, trimmed]);
    setInputValue('');
  }, [inputValue, tags, onChange]);

  const handleRemoveTag = useCallback(
    (indexToRemove: number) => {
      onChange(tags.filter((_, index) => index !== indexToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 阻止方向键传播以防止父菜单导航
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.stopPropagation();
        return;
      }

      // 如果 IME 正在组合则跳过
      if (e.nativeEvent.isComposing) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        // 输入为空时删除最后一个标签
        handleRemoveTag(tags.length - 1);
      }
    },
    [handleAddTag, handleRemoveTag, inputValue, tags.length]
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 4px',
        minHeight: '24px',
        backgroundColor: 'var(--input-background)',
        border: '1px solid var(--input-border)',
        borderRadius: '2px',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* 标签 */}
      {tags.map((tag, index) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '1px 6px',
            backgroundColor: 'var(--badge-background)',
            color: 'var(--badge-foreground)',
            borderRadius: '10px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemoveTag(index);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                marginLeft: '2px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--badge-foreground)',
                opacity: 0.7,
                transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              aria-label={`删除 ${tag}`}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {/* 输入框 */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: '60px',
          padding: '2px 4px',
          backgroundColor: 'transparent',
          color: 'var(--input-foreground)',
          border: 'none',
          outline: 'none',
          fontSize: '11px',
          fontFamily: 'monospace',
        }}
      />
    </div>
  );
}
