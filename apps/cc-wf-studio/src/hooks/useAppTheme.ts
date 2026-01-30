/**
 * 主题检测 Hook
 *
 * 检测当前主题（深色/浅色/高对比度）
 * 并在主题变化时响应式更新。
 */

import { useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light' | 'high-contrast';

/**
 * 从 body class 检测当前主题
 */
function detectTheme(): AppTheme {
  if (typeof document === 'undefined') {
    return 'dark'; // SSR 回退
  }
  if (document.body.classList.contains('light-theme')) {
    return 'light';
  }
  if (document.body.classList.contains('high-contrast')) {
    return 'high-contrast';
  }
  return 'dark'; // 默认深色
}

/**
 * 检测和跟踪主题变化的 Hook
 *
 * @returns 当前主题 ('dark' | 'light' | 'high-contrast')
 *
 * @example
 * ```tsx
 * const theme = useAppTheme();
 * const backgroundColor = theme === 'light' ? '#f0f0f0' : '#1e1e1e';
 * ```
 */
export function useAppTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>(() => detectTheme());

  useEffect(() => {
    // 挂载时更新主题（以防初始检测错误）
    setTheme(detectTheme());

    // 监听 body 元素的 class 变化
    const observer = new MutationObserver(() => {
      setTheme(detectTheme());
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

/**
 * 检查当前主题是否为深色（深色或高对比度）
 */
export function useIsDarkTheme(): boolean {
  const theme = useAppTheme();
  return theme === 'dark' || theme === 'high-contrast';
}
