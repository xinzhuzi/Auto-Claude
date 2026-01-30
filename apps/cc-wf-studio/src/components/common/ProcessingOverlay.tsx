/**
 * 处理中遮罩组件
 *
 * 在 AI 处理期间显示半透明遮罩以阻止用户交互。
 */

interface ProcessingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function ProcessingOverlay({ isVisible, message }: ProcessingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        cursor: 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {message && (
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--editor-background)',
            color: 'var(--editor-foreground)',
            borderRadius: '4px',
            border: '1px solid var(--panel-border)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
