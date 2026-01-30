/**
 * 窗口宽度 Hook
 *
 * 用于检测窗口宽度变化的自定义 hook
 * 用于响应式工具栏按钮
 */

import { useEffect, useState } from 'react';

const RESPONSIVE_BREAKPOINT = 900;

/**
 * 获取当前窗口宽度并监听调整大小的 Hook
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

/**
 * 检查窗口是否处于紧凑模式（宽度 <= 900px）
 */
export function useIsCompactMode(): boolean {
  const width = useWindowWidth();
  return width <= RESPONSIVE_BREAKPOINT;
}
