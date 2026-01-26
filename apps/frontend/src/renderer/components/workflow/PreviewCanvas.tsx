/**
 * Preview Canvas Component
 * ========================
 *
 * Read-only preview of workflow canvas.
 */

import React from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '../../lib/utils';

interface PreviewCanvasProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  nodes,
  edges,
  className,
}) => {
  return (
    <div className={cn('w-full h-full', className)}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
