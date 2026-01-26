/**
 * Minimap Container Component
 * ===========================
 *
 * Collapsible container for the React Flow minimap.
 */

import React, { useState } from 'react';
import { MiniMap } from 'reactflow';
import { Button } from '../ui/button';
import { Map, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MinimapContainerProps {
  className?: string;
  nodeColor?: (node: any) => string;
  nodeStrokeColor?: (node: any) => string;
  nodeBorderRadius?: number;
}

export const MinimapContainer: React.FC<MinimapContainerProps> = ({
  className,
  nodeColor,
  nodeStrokeColor,
  nodeBorderRadius = 8,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(true)}
        className={cn('absolute bottom-4 right-4 h-8 w-8 z-10', className)}
        title="Show Minimap"
      >
        <Map className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn('absolute bottom-4 right-4 z-10', className)}>
      <div className="relative border rounded-lg overflow-hidden bg-background/95 backdrop-blur-sm shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="absolute top-1 right-1 h-6 w-6 z-20"
          title="Hide Minimap"
        >
          <Minimize2 className="h-3 w-3" />
        </Button>
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeColor={nodeStrokeColor}
          nodeBorderRadius={nodeBorderRadius}
          pannable
          zoomable
          className="bg-background"
        />
      </div>
    </div>
  );
};
