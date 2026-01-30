/**
 * 工具执行指示器组件
 *
 * 在 Claude Code 工具执行期间显示动画指示器。
 * 显示带动画点的工具名称（1→2→3→1 循环）。
 *
 * 示例: 🔨Bash: npm run build...
 */

import { useEffect, useState } from 'react';

interface ToolExecutionIndicatorProps {
  /** 来自 claude-code-service 的工具信息（如 "Bash: npm run build"） */
  toolInfo: string;
  /** 字体大小（默认: 11） */
  fontSize?: number;
}

/**
 * 根据工具名称选择合适的表情符号
 */
function getToolEmoji(toolName: string): string {
  const lowerTool = toolName.toLowerCase();
  if (lowerTool.includes('bash')) return '🔨';
  if (lowerTool.includes('read')) return '📄';
  if (lowerTool.includes('write')) return '✏️';
  if (lowerTool.includes('edit')) return '✏️';
  if (lowerTool.includes('grep')) return '🔍';
  if (lowerTool.includes('glob')) return '🔍';
  if (lowerTool.includes('task')) return '📋';
  return '🔧'; // 默认
}

export function ToolExecutionIndicator({ toolInfo, fontSize = 11 }: ToolExecutionIndicatorProps) {
  const [dotCount, setDotCount] = useState(1);

  // 动画: 每 500ms 点从 1→2→3→1 变化
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // 防御性实现: toolInfo 为空时不显示
  if (!toolInfo || !toolInfo.trim()) {
    return null;
  }

  // 分离工具名称和描述
  const colonIndex = toolInfo.indexOf(':');
  const toolName = colonIndex !== -1 ? toolInfo.slice(0, colonIndex).trim() : toolInfo.trim();
  const toolDescription = colonIndex !== -1 ? toolInfo.slice(colonIndex + 1).trim() : '';

  // 工具名称为空时不显示
  if (!toolName) {
    return null;
  }

  const emoji = getToolEmoji(toolName);

  // 生成点字符串
  const dots = '.'.repeat(dotCount);

  return (
    <div
      style={{
        marginTop: '8px',
        marginBottom: '4px',
        fontSize: `${fontSize}px`,
        color: 'var(--description-foreground)',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span>{emoji}</span>
      <span>
        {toolName}
        {toolDescription && `: ${toolDescription}`}
        {dots}
      </span>
    </div>
  );
}
