/**
 * AI 生成按钮组件
 *
 * 带加载和取消状态的可复用 AI 生成按钮。
 * 正常显示 Sparkles 图标，生成时显示 Loader2 + X。
 */

import { Loader2, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { StyledTooltip } from './StyledTooltip';

interface AiGenerateButtonProps {
  /** AI 生成是否进行中 */
  isGenerating: boolean;
  /** 点击生成按钮时的回调 */
  onGenerate: () => void;
  /** 点击取消按钮时的回调 */
  onCancel: () => void;
  /** 生成按钮的提示文本 */
  generateTooltip: string;
  /** 取消按钮的提示文本 */
  cancelTooltip: string;
  /** 按钮是否禁用 */
  disabled?: boolean;
  /** 图标大小（默认: 14） */
  size?: number;
}

/**
 * AiGenerateButton 组件
 *
 * 可复用的 AI 生成触发按钮：
 * - 正常状态: Sparkles 图标
 * - 生成状态: Loader2（旋转）+ X（取消）图标
 */
export const AiGenerateButton: React.FC<AiGenerateButtonProps> = ({
  isGenerating,
  onGenerate,
  onCancel,
  generateTooltip,
  cancelTooltip,
  disabled = false,
  size = 14,
}) => {
  const buttonStyle: React.CSSProperties = {
    padding: '2px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    opacity: disabled ? 0.6 : 1,
  };

  const iconStyle: React.CSSProperties = {
    color: 'var(--foreground)',
  };

  const loaderStyle: React.CSSProperties = {
    color: 'var(--foreground)',
    animation: 'spin 1s linear infinite',
  };

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Loader2 size={size} style={loaderStyle} />
        <StyledTooltip content={cancelTooltip}>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            aria-label={cancelTooltip}
            style={buttonStyle}
          >
            <X size={size} style={iconStyle} />
          </button>
        </StyledTooltip>
      </div>
    );
  }

  return (
    <StyledTooltip content={generateTooltip}>
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        aria-label={generateTooltip}
        style={buttonStyle}
      >
        <Sparkles size={size} style={iconStyle} />
      </button>
    </StyledTooltip>
  );
};
