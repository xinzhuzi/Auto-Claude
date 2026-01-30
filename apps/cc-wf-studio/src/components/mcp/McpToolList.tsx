/**
 * MCP 工具列表组件
 *
 * 显示选定 MCP 服务器的工具列表，支持选择功能
 */

import { useTranslation } from 'react-i18next';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';

/** MCP 工具引用类型 */
export interface McpToolReference {
  name: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }>;
}

interface McpToolListProps {
  tools: McpToolReference[];
  loading?: boolean;
  error?: string | null;
  onToolSelect: (tool: McpToolReference) => void;
  selectedToolName?: string;
  searchQuery?: string;
}

export function McpToolList({
  tools,
  loading = false,
  error = null,
  onToolSelect,
  selectedToolName,
  searchQuery,
}: McpToolListProps) {
  const { t } = useTranslation('ccwfstudio');

  if (loading) {
    return <IndeterminateProgressBar label={t('mcp.loading.tools', '加载工具中...')} />;
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          color: 'var(--error-foreground)',
          backgroundColor: 'var(--input-validation-error-background)',
          border: '1px solid var(--input-validation-error-border)',
          borderRadius: '4px',
        }}
      >
        {error}
      </div>
    );
  }

  // 按搜索查询过滤工具
  const filteredTools = searchQuery
    ? tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tools;

  if (filteredTools.length === 0) {
    if (searchQuery) {
      return (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: 'var(--description-foreground)',
          }}
        >
          {t('mcp.search.noResults', { query: searchQuery, defaultValue: `未找到 "${searchQuery}" 相关结果` })}
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          color: 'var(--description-foreground)',
        }}
      >
        {t('mcp.empty.tools', '暂无可用工具')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {filteredTools.map((tool) => (
        <button
          key={tool.name}
          type="button"
          onClick={() => onToolSelect(tool)}
          style={{
            padding: '12px',
            backgroundColor:
              selectedToolName === tool.name
                ? 'var(--list-active-selection-background)'
                : 'var(--list-inactive-selection-background)',
            color:
              selectedToolName === tool.name
                ? 'var(--list-active-selection-foreground)'
                : 'var(--foreground)',
            border: '1px solid var(--panel-border)',
            borderRadius: '4px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (selectedToolName !== tool.name) {
              e.currentTarget.style.backgroundColor = 'var(--list-hover-background)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedToolName !== tool.name) {
              e.currentTarget.style.backgroundColor =
                'var(--list-inactive-selection-background)';
            }
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>{tool.name}</div>
          {tool.description && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--description-foreground)',
              }}
            >
              {tool.description}
            </div>
          )}
          {tool.parameters && tool.parameters.length > 0 && (
            <div
              style={{
                fontSize: '11px',
                marginTop: '6px',
                padding: '4px 6px',
                backgroundColor: 'var(--badge-background)',
                color: 'var(--badge-foreground)',
                borderRadius: '3px',
                display: 'inline-block',
              }}
            >
              {tool.parameters.length} 个参数
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
