/**
 * 警告对话框组件
 *
 * 简单的警告对话框组件
 * 仅有确定按钮，用于向用户通知信息
 * 使用 Radix UI Dialog
 */

import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  okLabel: string;
  onClose: () => void;
  /** 可选的标题前图标 */
  icon?: React.ReactNode;
}

/**
 * 警告对话框组件
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  okLabel,
  onClose,
  icon,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--editor-background)',
              border: '1px solid var(--panel-border)',
              borderRadius: '4px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              outline: 'none',
            }}
            onEscapeKeyDown={onClose}
          >
            {/* 带可选图标的标题 */}
            <Dialog.Title
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--foreground)',
                marginBottom: '16px',
              }}
            >
              {icon}
              {title}
            </Dialog.Title>

            {/* 消息 */}
            <Dialog.Description
              style={{
                fontSize: '13px',
                color: 'var(--description-foreground)',
                marginBottom: '24px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}
            >
              {message}
            </Dialog.Description>

            {/* 确定按钮 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '6px 20px',
                  backgroundColor: 'var(--button-background)',
                  color: 'var(--button-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--button-hover-background)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--button-background)';
                }}
              >
                {okLabel}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AlertDialog;
