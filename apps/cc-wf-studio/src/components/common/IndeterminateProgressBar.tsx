/**
 * 不确定进度条组件
 *
 * 用于加载状态的可复用不确定（无限）进度条。
 * 用于 MCP 服务器/工具加载操作和无限超时的 AI 优化。
 *
 * @example
 * ```tsx
 * <IndeterminateProgressBar label="正在加载 MCP 服务器..." />
 * ```
 */

interface IndeterminateProgressBarProps {
  /** 进度条上方的标签文本 */
  label: string;
  /** 字体大小（默认: 11） */
  fontSize?: number;
}

export function IndeterminateProgressBar({ label, fontSize = 11 }: IndeterminateProgressBarProps) {
  return (
    <div
      style={{
        marginTop: '8px',
      }}
    >
      {/* 加载标签 */}
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

      {/* 不确定进度条 */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'var(--editor-background)',
          borderRadius: '2px',
          overflow: 'hidden',
          border: '1px solid var(--panel-border)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            height: '100%',
            width: '30%',
            backgroundColor: 'var(--progress-bar-background)',
            animation: 'slide 1.5s ease-in-out infinite',
          }}
        />
      </div>

      <style>
        {`
          @keyframes slide {
            0% {
              left: -30%;
            }
            100% {
              left: 100%;
            }
          }
        `}
      </style>
    </div>
  );
}
