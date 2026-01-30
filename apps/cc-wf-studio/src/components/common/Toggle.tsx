/**
 * 开关组件
 *
 * 基于 radix-ui 的可复用开关组件，带有 OFF/ON 标签
 * 显示在开关背景中（iOS 风格设计）。
 */

import * as Switch from '@radix-ui/react-switch';
import type React from 'react';

export interface ToggleProps {
  /** 开关状态 */
  checked: boolean;
  /** 状态变化时的回调 */
  onChange: (checked: boolean) => void;
  /** 禁用状态 */
  disabled?: boolean;
  /** OFF 状态的标签（默认: "OFF"） */
  offLabel?: string;
  /** ON 状态的标签（默认: "ON"） */
  onLabel?: string;
  /** 无障碍标签 */
  ariaLabel?: string;
  /** 尺寸变体（默认: "medium"） */
  size?: 'small' | 'medium';
}

/**
 * 开关组件
 *
 * 带有 OFF/ON 标签显示在背景中的开关。
 * 滑块滑动以指示当前状态。
 */
export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  offLabel = 'OFF',
  onLabel = 'ON',
  ariaLabel,
  size = 'medium',
}) => {
  // 基于尺寸的尺寸
  const dimensions =
    size === 'small'
      ? { width: 54, height: 26, thumbSize: 18, fontSize: 10, padding: 4 }
      : { width: 64, height: 30, thumbSize: 22, fontSize: 11, padding: 4 };

  const thumbOffset = dimensions.padding;
  const thumbTravel = dimensions.width - dimensions.thumbSize - dimensions.padding * 2;

  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        all: 'unset',
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        // ON: 绿色, OFF: 灰色
        backgroundColor: checked
          ? 'var(--testing-icon-passed, #4caf50)'
          : 'var(--titlebar-inactive-background, #3c3c3c)',
        borderRadius: `${dimensions.height / 2}px`,
        position: 'relative',
        border: checked ? 'none' : '1px solid var(--input-border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        transition: 'background-color 100ms',
      }}
    >
      {/* 滑块对面的标签 */}
      <span
        style={{
          position: 'absolute',
          // OFF: 滑块在左边，标签在右边 / ON: 滑块在右边，标签在左边
          left: checked ? `${dimensions.padding + 4}px` : 'auto',
          right: checked ? 'auto' : `${dimensions.padding + 4}px`,
          fontSize: `${dimensions.fontSize}px`,
          fontWeight: 600,
          // ON: 绿色上的白色文字 / OFF: 灰色上的深色文字
          color: checked ? 'var(--button-foreground, #fff)' : 'var(--foreground)',
          pointerEvents: 'none',
          transition: 'left 100ms, right 100ms, color 100ms',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        {checked ? onLabel : offLabel}
      </span>

      {/* 滑块 */}
      <Switch.Thumb
        style={{
          all: 'unset',
          display: 'block',
          position: 'absolute',
          width: `${dimensions.thumbSize}px`,
          height: `${dimensions.thumbSize}px`,
          // ON: 绿色上的编辑器背景 / OFF: 灰色上的输入背景
          backgroundColor: checked
            ? 'var(--editor-background)'
            : 'var(--input-background)',
          borderRadius: '50%',
          border: '1px solid var(--input-border)',
          transition: 'transform 100ms, background-color 100ms',
          transform: checked ? `translateX(${thumbTravel}px)` : `translateX(${thumbOffset}px)`,
          willChange: 'transform',
          left: 0,
          zIndex: 1,
          boxSizing: 'border-box',
        }}
      />
    </Switch.Root>
  );
};

export default Toggle;
