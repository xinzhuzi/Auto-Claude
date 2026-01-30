/**
 * 小地图容器组件
 *
 * 包装 MiniMap 的容器组件，提供边框框架和最小化/展开切换按钮
 */

import { Map as MapIcon, Minus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyledTooltip } from './common/StyledTooltip';

interface MinimapContainerProps {
  children: React.ReactNode;
  /** 初始可见状态（默认: true） */
  defaultVisible?: boolean;
  /** 可见状态变化回调 */
  onVisibilityChange?: (visible: boolean) => void;
}

/**
 * MinimapContainer 组件
 *
 * 用边框容器和最小化按钮（右上角）包装 MiniMap
 * 最小化时，仅显示地图图标按钮以展开
 */
export const MinimapContainer: React.FC<MinimapContainerProps> = ({
  children,
  defaultVisible = true,
  onVisibilityChange,
}) => {
  const { t } = useTranslation('ccwfstudio');
  const [isVisible, setIsVisible] = useState(defaultVisible);

  const toggleVisibility = () => {
    const newVisible = !isVisible;
    setIsVisible(newVisible);
    onVisibilityChange?.(newVisible);
  };

  // 通用按钮样式（高度透明以不遮挡画布）
  const buttonBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'color-mix(in srgb, var(--editor-background) 30%, transparent)',
    border: '1px solid color-mix(in srgb, var(--panel-border) 30%, transparent)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--foreground)',
  };

  // 最小化时：仅显示展开按钮
  if (!isVisible) {
    return (
      <StyledTooltip content={t('toolbar.minimapToggle.show', '显示小地图')} side="left">
        <button
          type="button"
          onClick={toggleVisibility}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleVisibility();
            }
          }}
          aria-label={t('toolbar.minimapToggle.show', '显示小地图')}
          style={{
            ...buttonBaseStyle,
            width: '28px',
            height: '28px',
          }}
        >
          <MapIcon size={14} />
        </button>
      </StyledTooltip>
    );
  }

  // 可见时：显示带最小化按钮的边框容器（高度透明框架）
  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid color-mix(in srgb, var(--panel-border) 30%, transparent)',
        borderRadius: '6px',
        backgroundColor: 'color-mix(in srgb, var(--editor-background) 20%, transparent)',
        padding: '2px 8px 2px 0px',
      }}
    >
      {/* 最小化按钮（右上角） */}
      <StyledTooltip content={t('toolbar.minimapToggle.hide', '隐藏小地图')} side="left">
        <button
          type="button"
          onClick={toggleVisibility}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleVisibility();
            }
          }}
          aria-label={t('toolbar.minimapToggle.hide', '隐藏小地图')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'color-mix(in srgb, var(--editor-background) 70%, transparent)',
            border: '1px solid color-mix(in srgb, var(--panel-border) 30%, transparent)',
            borderTop: 'none',
            borderRight: 'none',
            borderRadius: '0px 0px 0px 4px',
            cursor: 'pointer',
            color: 'var(--foreground)',
            backdropFilter: 'blur(4px)',
            position: 'absolute',
            top: '0px',
            right: '0px',
            zIndex: 10,
            width: '20px',
            height: '20px',
          }}
        >
          <Minus size={12} />
        </button>
      </StyledTooltip>

      {/* MiniMap 内容 */}
      {children}
    </div>
  );
};
