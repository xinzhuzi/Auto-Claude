/**
 * 错误通知组件
 *
 * 显示错误消息
 */

import type React from 'react';
import { useEffect, useState } from 'react';

/** 错误载荷类型 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

interface ErrorNotificationProps {
  error: ErrorPayload | null;
  onDismiss: () => void;
}

/**
 * ErrorNotification 组件
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ error, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);
    }
  }, [error]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // 等待淡出动画
  };

  if (!error || !visible) {
    return null;
  }

  const { code, message, details } = error;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        maxWidth: '400px',
        padding: '12px 16px',
        backgroundColor: 'var(--input-validation-error-background)',
        border: '1px solid var(--input-validation-error-border)',
        borderRadius: '4px',
        color: 'var(--input-validation-error-foreground)',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '13px' }}>❌ 错误: {code}</div>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* 消息 */}
      <div style={{ fontSize: '12px', lineHeight: '1.5' }}>{message}</div>

      {/* 详情（如果有） */}
      {details && (
        <details style={{ marginTop: '8px', fontSize: '11px' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--description-foreground)' }}>
            详情
          </summary>
          <pre
            style={{
              marginTop: '4px',
              padding: '8px',
              backgroundColor: 'var(--text-code-block-background)',
              borderRadius: '2px',
              overflow: 'auto',
              maxHeight: '150px',
            }}
          >
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
