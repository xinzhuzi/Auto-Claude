/**
 * 进度条组件
 *
 * 用于 AI 处理指示的可复用进度条。
 * 在 AI 优化期间用于消息气泡。
 */

import { useEffect, useState } from 'react';

interface ProgressBarProps {
  /** 显示进度条 */
  isProcessing: boolean;
  /** 进度条上方的标签文本（可选） */
  label?: string;
  /** 最大处理时间（秒，来自超时设置） */
  maxSeconds: number;
  /** 字体大小（默认: 11） */
  fontSize?: number;
}

export function ProgressBar({ isProcessing, label, maxSeconds, fontSize = 11 }: ProgressBarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 进度计时器
  useEffect(() => {
    if (!isProcessing) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= maxSeconds) {
          return maxSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, maxSeconds]);

  if (!isProcessing) {
    return null;
  }

  // 使用缓出函数计算进度百分比（最大 95%）
  const normalizedTime = elapsedSeconds / maxSeconds;
  const easedProgress = 1 - (1 - normalizedTime) ** 2;
  const progressPercentage = Math.min(Math.round(easedProgress * 95), 95);

  return (
    <div
      style={{
        marginTop: '8px',
      }}
    >
      {label && (
        <div
          style={{
            marginBottom: '6px',
            fontSize: `${fontSize}px`,
            color: 'var(--description-foreground)',
            fontStyle: 'italic',
          }}
        >
          {label}
        </div>
      )}

      {/* 进度条 */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'var(--editor-background)',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '4px',
          border: '1px solid var(--panel-border)',
        }}
      >
        <div
          style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: 'var(--progress-bar-background)',
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>

      {/* 进度文本 */}
      <div
        style={{
          fontSize: `${fontSize - 1}px`,
          color: 'var(--description-foreground)',
          opacity: 0.7,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{progressPercentage}%</span>
        <span>
          {elapsedSeconds}s / {maxSeconds}s
        </span>
      </div>
    </div>
  );
}
