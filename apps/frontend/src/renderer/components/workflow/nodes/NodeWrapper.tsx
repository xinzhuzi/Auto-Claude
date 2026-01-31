/**
 * NodeWrapper Component
 *
 * Wraps all workflow nodes with common functionality like delete button
 */

import React from 'react';
import { X } from 'lucide-react';
import { useWorkflowStore, useActiveWorkflow } from '../../../stores/workflow-store';

interface NodeWrapperProps {
  nodeId: string;
  selected?: boolean;
  children: React.ReactNode;
}

export const NodeWrapper: React.FC<NodeWrapperProps> = ({
  nodeId,
  selected,
  children,
}) => {
  const activeWorkflow = useActiveWorkflow();
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const [isHovered, setIsHovered] = React.useState(false);

  // Handle delete node
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!activeWorkflow) return;

    const updatedNodes = activeWorkflow.nodes.filter((node) => node.id !== nodeId);
    const updatedConnections = activeWorkflow.connections.filter(
      (conn) => conn.from !== nodeId && conn.to !== nodeId
    );

    saveWorkflow({
      ...activeWorkflow,
      nodes: updatedNodes,
      connections: updatedConnections,
    });
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete Button */}
      {(selected || isHovered) && (
        <button
          onClick={handleDelete}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          title="删除节点"
        >
          <X style={{ width: '12px', height: '12px' }} />
        </button>
      )}
      {children}
    </div>
  );
};

export default NodeWrapper;
