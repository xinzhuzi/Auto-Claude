/**
 * 使用条款对话框组件
 *
 * 首次用户的使用条款对话框
 */

import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TermsOfUseDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * 使用条款对话框组件
 */
export const TermsOfUseDialog: React.FC<TermsOfUseDialogProps> = ({
  isOpen,
  onAccept,
  onCancel,
}) => {
  const { t } = useTranslation('ccwfstudio');
  const [agreed, setAgreed] = useState(false);

  // 对话框关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      setAgreed(false);
    }
  }, [isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--editor-background)',
              border: '1px solid var(--panel-border)',
              borderRadius: '4px',
              padding: '32px',
              minWidth: '500px',
              maxWidth: '600px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              outline: 'none',
            }}
          >
            {/* 标题 */}
            <Dialog.Title
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--foreground)',
                marginBottom: '20px',
              }}
            >
              {t('terms.title', '使用条款')}
            </Dialog.Title>

            {/* 内容 */}
            <Dialog.Description asChild>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--description-foreground)',
                  marginBottom: '24px',
                  lineHeight: '1.6',
                }}
              >
                {/* 介绍 */}
                <p style={{ marginBottom: '16px' }}>
                  {t('terms.introduction', '使用本工具前，请阅读并同意以下条款。')}
                </p>

                {/* 禁止用途 */}
                <p style={{ marginBottom: '8px', fontWeight: 500 }}>
                  {t('terms.prohibitedUse', '禁止用途：')}
                </p>
                <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
                  <li style={{ marginBottom: '4px' }}>{t('terms.cyberAttack', '网络攻击')}</li>
                  <li style={{ marginBottom: '4px' }}>{t('terms.malware', '恶意软件')}</li>
                  <li style={{ marginBottom: '4px' }}>{t('terms.personalDataTheft', '个人数据盗窃')}</li>
                  <li style={{ marginBottom: '4px' }}>{t('terms.otherIllegalActs', '其他非法行为')}</li>
                </ul>

                {/* 责任 */}
                <p style={{ marginBottom: '16px', fontWeight: 500 }}>
                  {t('terms.liability', '用户对使用本工具的行为承担全部责任。')}
                </p>
              </div>
            </Dialog.Description>

            {/* 复选框 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setAgreed(!agreed)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAgreed(!agreed);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  marginRight: '8px',
                  cursor: 'pointer',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--foreground)',
                }}
              >
                {t('terms.agree', '我已阅读并同意使用条款')}
              </span>
            </div>

            {/* 按钮 */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '8px 20px',
                  backgroundColor: 'var(--button-secondary-background)',
                  color: 'var(--button-secondary-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--button-secondary-hover-background)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--button-secondary-background)';
                }}
              >
                {t('terms.cancelButton', '取消')}
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={!agreed}
                style={{
                  padding: '8px 20px',
                  backgroundColor: agreed
                    ? 'var(--button-background)'
                    : 'var(--button-secondary-background)',
                  color: agreed
                    ? 'var(--button-foreground)'
                    : 'var(--button-secondary-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: agreed ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 500,
                  opacity: agreed ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (agreed) {
                    e.currentTarget.style.backgroundColor = 'var(--button-hover-background)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (agreed) {
                    e.currentTarget.style.backgroundColor = 'var(--button-background)';
                  }
                }}
              >
                {t('terms.agreeButton', '同意')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default TermsOfUseDialog;
