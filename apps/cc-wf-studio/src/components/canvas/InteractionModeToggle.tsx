/**
 * 交互模式切换组件
 *
 * 画布交互模式切换（平移/选择）
 */

import * as Switch from '@radix-ui/react-switch';
import { Hand, MousePointerClick } from 'lucide-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

export type InteractionMode = 'pan' | 'selection';

interface InteractionModeToggleProps {
  /** 当前交互模式 */
  mode: InteractionMode;
  /** 模式变化回调 */
  onModeChange: (mode: InteractionMode) => void;
}

/**
 * InteractionModeToggle 组件
 *
 * 提供在平移和选择模式之间切换的 UI
 */
export const InteractionModeToggle: React.FC<InteractionModeToggleProps> = ({
  mode,
  onModeChange,
}) => {
  const { t } = useTranslation('ccwfstudio');

  const toggleMode = () => {
    onModeChange(mode === 'pan' ? 'selection' : 'pan');
  };

  return (
    <StyledTooltipProvider>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--editor-background)',
          border: '1px solid var(--panel-border)',
          borderRadius: '20px',
          padding: '4px 6px',
          opacity: 0.85,
        }}
      >
        {/* 平移模式图标（左） */}
        <StyledTooltipItem content={t('toolbar.interactionMode.switchToPan', '切换到平移模式')}>
          <div
            onClick={() => {
              if (mode !== 'pan') {
                onModeChange('pan');
              }
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && mode !== 'pan') {
                e.preventDefault();
                onModeChange('pan');
              }
            }}
            role="button"
            tabIndex={mode === 'pan' ? -1 : 0}
            aria-label={t('toolbar.interactionMode.switchToPan', '切换到平移模式')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: mode === 'pan' ? 'var(--badge-background)' : 'transparent',
              transition: 'background-color 150ms',
              cursor: mode === 'pan' ? 'default' : 'pointer',
            }}
          >
            <Hand
              size={12}
              style={{
                color: mode === 'pan' ? 'var(--badge-foreground)' : 'var(--disabled-foreground)',
              }}
            />
          </div>
        </StyledTooltipItem>

        {/* 开关 */}
        <Switch.Root
          checked={mode === 'selection'}
          onCheckedChange={toggleMode}
          aria-label="画布交互模式"
          style={{
            all: 'unset',
            width: '32px',
            height: '18px',
            backgroundColor: 'var(--input-background)',
            borderRadius: '9px',
            position: 'relative',
            border: '1px solid var(--input-border)',
            cursor: 'pointer',
          }}
        >
          <Switch.Thumb
            style={{
              all: 'unset',
              display: 'block',
              width: '14px',
              height: '14px',
              backgroundColor: 'var(--button-background)',
              borderRadius: '7px',
              transition: 'transform 100ms',
              transform: mode === 'selection' ? 'translateX(16px)' : 'translateX(2px)',
              willChange: 'transform',
              margin: '1px',
            }}
          />
        </Switch.Root>

        {/* 选择模式图标（右） */}
        <StyledTooltipItem content={t('toolbar.interactionMode.switchToSelection', '切换到选择模式')}>
          <div
            onClick={() => {
              if (mode !== 'selection') {
                onModeChange('selection');
              }
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && mode !== 'selection') {
                e.preventDefault();
                onModeChange('selection');
              }
            }}
            role="button"
            tabIndex={mode === 'selection' ? -1 : 0}
            aria-label={t('toolbar.interactionMode.switchToSelection', '切换到选择模式')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: mode === 'selection' ? 'var(--badge-background)' : 'transparent',
              transition: 'background-color 150ms',
              cursor: mode === 'selection' ? 'default' : 'pointer',
            }}
          >
            <MousePointerClick
              size={12}
              style={{
                color:
                  mode === 'selection' ? 'var(--badge-foreground)' : 'var(--disabled-foreground)',
              }}
            />
          </div>
        </StyledTooltipItem>
      </div>
    </StyledTooltipProvider>
  );
};
