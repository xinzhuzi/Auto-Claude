/**
 * 样式化提示框组件
 *
 * 具有一致样式的可复用提示框组件
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import type React from 'react';

interface StyledTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  delayDuration?: number;
}

const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--editor-hover-widget-background)',
  color: 'var(--editor-hover-widget-foreground)',
  border: '1px solid var(--editor-hover-widget-border)',
  borderRadius: '3px',
  padding: '6px 8px',
  fontSize: '12px',
  maxWidth: '250px',
  zIndex: 10000,
};

const tooltipArrowStyle: React.CSSProperties = {
  fill: 'var(--editor-hover-widget-border)',
};

/**
 * StyledTooltip 组件
 *
 * 具有一致样式的可复用提示框。
 * 使用预定义样式包装 radix-ui Tooltip。
 */
export const StyledTooltip: React.FC<StyledTooltipProps> = ({
  children,
  content,
  side = 'bottom',
  sideOffset = 5,
  delayDuration = 300,
}) => {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side={side} sideOffset={sideOffset} style={tooltipContentStyle}>
            {content}
            <Tooltip.Arrow style={tooltipArrowStyle} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

/**
 * StyledTooltipProvider 组件
 *
 * 当需要多个提示框共享同一个 Provider 时使用。
 * 避免嵌套多个 Provider。
 */
export const StyledTooltipProvider: React.FC<{
  children: React.ReactNode;
  delayDuration?: number;
}> = ({ children, delayDuration = 300 }) => {
  return <Tooltip.Provider delayDuration={delayDuration}>{children}</Tooltip.Provider>;
};

/**
 * StyledTooltipItem 组件
 *
 * 在 StyledTooltipProvider 内部使用，用于多个提示框。
 */
export const StyledTooltipItem: React.FC<{
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}> = ({ children, content, side = 'bottom', sideOffset = 5 }) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={sideOffset} style={tooltipContentStyle}>
          {content}
          <Tooltip.Arrow style={tooltipArrowStyle} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
