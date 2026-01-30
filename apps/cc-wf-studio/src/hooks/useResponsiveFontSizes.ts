/**
 * 响应式字体大小 Hook
 *
 * 根据面板宽度计算字体大小，用于响应式设计。
 */

import { useMemo } from 'react';

export type PanelSizeMode = 'compact' | 'normal' | 'expanded';

export interface ResponsiveFontSizes {
  base: number;
  small: number;
  xsmall: number;
  button: number;
  title: number;
}

const BREAKPOINTS = {
  COMPACT_MAX: 280,
  EXPANDED_MIN: 450,
} as const;

const BASE_FONT_SIZES: ResponsiveFontSizes = {
  base: 13,
  small: 11,
  xsmall: 10,
  button: 12,
  title: 13,
};

const SCALE_FACTORS: Record<PanelSizeMode, number> = {
  compact: 0.85,
  normal: 1.0,
  expanded: 1.1,
};

/**
 * 根据宽度确定面板大小模式
 */
export function getPanelSizeMode(width: number): PanelSizeMode {
  if (width < BREAKPOINTS.COMPACT_MAX) return 'compact';
  if (width > BREAKPOINTS.EXPANDED_MIN) return 'expanded';
  return 'normal';
}

/**
 * 根据面板宽度计算响应式字体大小的 Hook
 *
 * @param width - 当前面板宽度（像素）
 * @returns 包含 base、small、xsmall、button 和 title 大小的字体对象
 */
export function useResponsiveFontSizes(width: number): ResponsiveFontSizes {
  return useMemo(() => {
    const mode = getPanelSizeMode(width);
    const scale = SCALE_FACTORS[mode];

    return {
      base: Math.round(BASE_FONT_SIZES.base * scale),
      small: Math.round(BASE_FONT_SIZES.small * scale),
      xsmall: Math.round(BASE_FONT_SIZES.xsmall * scale),
      button: Math.round(BASE_FONT_SIZES.button * scale),
      title: Math.round(BASE_FONT_SIZES.title * scale),
    };
  }, [width]);
}
