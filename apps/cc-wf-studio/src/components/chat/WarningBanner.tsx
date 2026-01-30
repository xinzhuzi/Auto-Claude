/**
 * 警告横幅组件
 *
 * 当迭代次数达到 20 次或更多时显示警告消息。
 */

import { useTranslation } from 'react-i18next';

interface WarningBannerProps {
  /** 字体大小（默认: 13） */
  fontSize?: number;
}

export function WarningBanner({ fontSize = 13 }: WarningBannerProps) {
  const { t } = useTranslation('ccwfstudio');

  return (
    <div
      style={{
        padding: '12px 16px',
        margin: '0 16px 12px 16px',
        borderRadius: '6px',
        backgroundColor: 'var(--input-validation-warning-background)',
        border: '1px solid var(--input-validation-warning-border)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
      }}
    >
      {/* 警告图标 */}
      <div
        style={{
          flexShrink: 0,
          width: '16px',
          height: '16px',
          marginTop: '2px',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="警告"
        >
          <title>警告</title>
          <path
            d="M8 1L1 14H15L8 1Z"
            stroke="var(--input-validation-warning-foreground)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M8 6V9"
            stroke="var(--input-validation-warning-foreground)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx="8"
            cy="11.5"
            r="0.75"
            fill="var(--input-validation-warning-foreground)"
          />
        </svg>
      </div>

      {/* 警告消息 */}
      <div
        style={{
          flex: 1,
          fontSize: `${fontSize}px`,
          lineHeight: '1.5',
          color: 'var(--input-validation-warning-foreground)',
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>
          {t('refinement.warning.title', '迭代次数过多')}
        </div>
        <div style={{ opacity: 0.9 }}>
          {t('refinement.warning.message', '建议开始新的对话以获得更好的结果')}
        </div>
      </div>
    </div>
  );
}
