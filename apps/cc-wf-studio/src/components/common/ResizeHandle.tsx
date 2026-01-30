/**
 * 调整大小手柄组件
 *
 * 用于调整侧边栏面板大小的可拖拽垂直线。
 */

import type React from 'react';
import { useState } from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * ResizeHandle 组件
 *
 * 显示在侧边栏面板左边缘的可拖拽垂直线。
 * 在悬停和拖拽操作时提供视觉反馈。
 */
export function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        cursor: 'ew-resize',
        backgroundColor: isHovered ? 'var(--focus-border)' : 'transparent',
        transition: 'background-color 0.2s ease',
        zIndex: 10,
      }}
      aria-label="调整侧边栏大小"
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={0}
    />
  );
}
