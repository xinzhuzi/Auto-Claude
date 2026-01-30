/**
 * 模式指示徽章组件
 *
 * 显示当前 MCP 节点模式的只读徽章
 */

import { useTranslation } from 'react-i18next';

/** MCP 节点模式类型 */
export type McpNodeMode = 'manualParameterConfig' | 'aiParameterConfig' | 'aiToolSelection';

interface ModeIndicatorBadgeProps {
  mode: McpNodeMode;
}

interface ModeInfo {
  titleKey: string;
  defaultTitle: string;
}

const MODE_INFO: Record<McpNodeMode, ModeInfo> = {
  manualParameterConfig: {
    titleKey: 'mcp.modeSelection.manualParameterConfig.title',
    defaultTitle: '手动配置',
  },
  aiParameterConfig: {
    titleKey: 'mcp.modeSelection.aiParameterConfig.title',
    defaultTitle: 'AI 参数配置',
  },
  aiToolSelection: {
    titleKey: 'mcp.modeSelection.aiToolSelection.title',
    defaultTitle: 'AI 工具选择',
  },
};

/**
 * 模式指示徽章组件
 *
 * 显示当前 MCP 节点模式的只读徽章。
 * 用于画布节点和编辑对话框中指示配置模式。
 *
 * @param props - 组件属性
 * @param props.mode - 当前 MCP 节点模式
 */
export function ModeIndicatorBadge({ mode }: ModeIndicatorBadgeProps) {
  const { t } = useTranslation('ccwfstudio');
  const info = MODE_INFO[mode];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        backgroundColor: 'var(--badge-background)',
        color: 'var(--badge-foreground)',
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: 'bold',
      }}
    >
      {/* 模式名称 */}
      <span>{t(info.titleKey, info.defaultTitle)}</span>
    </div>
  );
}
