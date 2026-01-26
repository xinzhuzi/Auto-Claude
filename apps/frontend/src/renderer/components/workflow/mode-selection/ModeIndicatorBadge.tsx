/**
 * Mode Indicator Badge
 * ====================
 *
 * Visual indicator showing the current execution mode of a workflow node.
 * Displays different colors and icons based on the mode.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Code, Zap, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExecutionMode = 'ai' | 'code' | 'auto' | 'manual';

interface ModeIndicatorBadgeProps {
  mode: ExecutionMode;
  className?: string;
}

const modeConfig = {
  ai: {
    label: 'AI Mode',
    icon: Bot,
    variant: 'default' as const,
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  code: {
    label: 'Code Mode',
    icon: Code,
    variant: 'secondary' as const,
    className: 'bg-green-500 hover:bg-green-600 text-white',
  },
  auto: {
    label: 'Auto Mode',
    icon: Zap,
    variant: 'default' as const,
    className: 'bg-purple-500 hover:bg-purple-600',
  },
  manual: {
    label: 'Manual Mode',
    icon: Settings,
    variant: 'outline' as const,
    className: '',
  },
};

export const ModeIndicatorBadge: React.FC<ModeIndicatorBadgeProps> = ({
  mode,
  className,
}) => {
  const config = modeConfig[mode];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn('gap-1', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
};
