/**
 * 可删除边组件
 *
 * 带删除按钮的自定义边组件。
 * 仅在边被选中时显示删除按钮。
 */

import type React from 'react';
import { BaseEdge, type EdgeProps, getBezierPath, useReactFlow } from 'reactflow';

/**
 * 可删除边组件
 *
 * 扩展 React Flow 的默认边，在选中时显示删除按钮。
 */
export const DeletableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  markerEnd,
}) => {
  const { setEdges } = useReactFlow();

  // 计算贝塞尔曲线路径和中心坐标
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 删除按钮点击处理器 - 直接删除无需确认
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止边选择事件
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      {/* 基础边 */}
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />

      {/* 仅在选中时显示删除按钮 */}
      {selected && (
        <foreignObject
          x={labelX - 9}
          y={labelY - 9}
          width={18}
          height={18}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <button
            type="button"
            onClick={handleDeleteClick}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '3px',
              backgroundColor: 'var(--error-foreground)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            title="删除连接"
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
              aria-labelledby="delete-edge-icon-title"
            >
              <title id="delete-edge-icon-title">删除</title>
              <path
                d="M1 1L7 7M7 1L1 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </foreignObject>
      )}
    </>
  );
};

export default DeletableEdge;
