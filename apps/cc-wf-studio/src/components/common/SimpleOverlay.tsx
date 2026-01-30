/**
 * 简单遮罩组件
 *
 * 显示半透明遮罩，不带任何消息。
 * 用于在 AI 处理期间阻止节点面板等区域的交互。
 */

interface SimpleOverlayProps {
  isVisible: boolean;
}

export function SimpleOverlay({ isVisible }: SimpleOverlayProps) {
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
      }}
    />
  );
}
