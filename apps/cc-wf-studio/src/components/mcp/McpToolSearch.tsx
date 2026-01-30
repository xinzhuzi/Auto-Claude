/**
 * MCP 工具搜索组件
 *
 * 用于过滤 MCP 工具的搜索输入框
 */

import { useTranslation } from 'react-i18next';

interface McpToolSearchProps {
  value: string;
  onChange: (query: string) => void;
  disabled?: boolean;
}

export function McpToolSearch({ value, onChange, disabled }: McpToolSearchProps) {
  const { t } = useTranslation('ccwfstudio');

  return (
    <div style={{ marginBottom: '12px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('mcp.search.placeholder', '搜索工具...')}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: 'var(--input-background)',
          color: 'var(--input-foreground)',
          border: '1px solid var(--input-border)',
          borderRadius: '4px',
          fontSize: '13px',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.border =
              '1px solid var(--focus-border, var(--input-border))';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = '1px solid var(--input-border)';
        }}
      />
    </div>
  );
}
