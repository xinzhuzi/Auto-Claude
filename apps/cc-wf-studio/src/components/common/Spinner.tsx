/**
 * 加载动画组件
 *
 * 使用 CSS 动画的简单圆形加载动画。
 */

import type React from 'react';

export interface SpinnerProps {
  /** 动画大小（像素，默认: 32） */
  size?: number;
  /** 边框粗细（像素，默认: 3） */
  thickness?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 32, thickness = 3 }) => {
  return (
    <>
      <div
        className="spinner"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `${thickness}px solid var(--progress-bar-background, #0078d4)`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
        }}
      />
      <style>
        {`
          .spinner {
            animation: spinner-spin 1s linear infinite;
          }
          @keyframes spinner-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};
