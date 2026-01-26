/**
 * ExecutionPanel Component
 *
 * Real-time workflow execution status and logs display
 * Shows progress, node execution status, and log output
 */

import React, { useMemo } from 'react';
import { Card } from '@frontend/src/renderer/components/ui/card';
import { ScrollArea } from '@frontend/src/renderer/components/ui/scroll-area';
import { Button } from '@frontend/src/renderer/components/ui/button';
import { Badge } from '@frontend/src/renderer/components/ui/badge';
import { Progress } from '@frontend/src/renderer/components/ui/progress';
import { cn } from '@frontend/src/renderer/lib/utils';

import {
  Play,
  Pause,
  Stop,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

import { useExecutionStore } from '@frontend/src/renderer/stores/execution-store';
import { useActiveWorkflow } from '@frontend/src/renderer/stores/workflow-store';

interface ExecutionPanelProps {
  className?: string;
}

/**
 * ExecutionPanel Component
 */
const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ className }) => {
  const {
    activeExecutionId,
    executions,
    logs,
    isLoading,
    error,
    executeWorkflow,
    pauseExecution,
    resumeExecution,
    stopExecution,
    getActiveExecution,
    getExecutionLogsSync,
  } = useExecutionStore();

  // 使用正确的 hook 获取活动工作流
  const activeWorkflow = useActiveWorkflow();

  // 获取当前执行记录
  const activeExecution = activeExecutionId ? executions.get(activeExecutionId) : undefined;

  // 计算执行状态
  const isExecuting = activeExecution?.status === 'running' || activeExecution?.status === 'pending';
  const isPaused = activeExecution?.status === 'paused';
  const currentExecutionId = activeExecutionId;

  // 获取执行日志
  const executionLogs = activeExecutionId ? getExecutionLogsSync(activeExecutionId) : [];

  // 计算进度（简化版本，基于日志数量）
  const progress = 0; // TODO: 实现真实的进度计算

  /**
   * Get status icon and color based on execution state
   */
  const statusInfo = useMemo(() => {
    if (!activeWorkflow) {
      return {
        icon: null,
        label: 'No workflow',
        color: 'muted',
        variant: 'secondary' as const,
      };
    }

    if (!isExecuting && !currentExecutionId) {
      return {
        icon: null,
        label: 'Ready',
        color: 'muted',
        variant: 'secondary' as const,
      };
    }

    if (isPaused) {
      return {
        icon: Pause,
        label: 'Paused',
        color: 'yellow',
        variant: 'outline' as const,
      };
    }

    if (isExecuting) {
      return {
        icon: RotateCw,
        label: 'Running',
        color: 'blue',
        variant: 'default' as const,
      };
    }

    // Check last execution result from logs
    const lastLog = executionLogs[executionLogs.length - 1];
    if (lastLog) {
      if (lastLog.level === 'error') {
        return {
          icon: XCircle,
          label: 'Failed',
          color: 'red',
          variant: 'destructive' as const,
        };
      }
      if (lastLog.level === 'warn') {
        return {
          icon: AlertCircle,
          label: 'Warning',
          color: 'yellow',
          variant: 'outline' as const,
        };
      }
    }

    return {
      icon: CheckCircle2,
      label: 'Completed',
      color: 'green',
      variant: 'default' as const,
    };
  }, [activeWorkflow, isExecuting, isPaused, currentExecutionId, executionLogs]);

  const StatusIcon = statusInfo.icon;

  /**
   * Handle execute button click
   */
  const handleExecute = async () => {
    if (!activeWorkflow) return;
    try {
      await executeWorkflow(activeWorkflow.id, {});
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  /**
   * Render control buttons
   * 始终显示执行按钮，即使没有活动工作流也显示（但禁用）
   */
  const ControlButtons = () => {
    console.log('[ExecutionPanel] ControlButtons render:', {
      activeWorkflow: !!activeWorkflow,
      isExecuting,
      isPaused,
      currentExecutionId,
      activeExecutionStatus: activeExecution?.status,
    });

    return (
      <div className="flex gap-2">
        {/* 始终显示执行按钮，没有工作流时禁用 */}
        {!isExecuting && !isPaused && (
          <Button
            size="sm"
            onClick={handleExecute}
            className="gap-2"
            disabled={!activeWorkflow}
            data-testid="execute-button"
          >
            <Play className="w-4 h-4" />
            {currentExecutionId ? 'Re-execute' : 'Execute'}
          </Button>
        )}

        {isExecuting && !isPaused && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => activeExecutionId && pauseExecution(activeExecutionId)}
              className="gap-2"
              data-testid="pause-button"
            >
              <Pause className="w-4 h-4" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => activeExecutionId && stopExecution(activeExecutionId)}
              className="gap-2"
              data-testid="stop-button"
            >
              <Stop className="w-4 h-4" />
              Stop
            </Button>
          </>
        )}

        {isPaused && (
          <>
            <Button
              size="sm"
              onClick={() => activeExecutionId && resumeExecution(activeExecutionId)}
              className="gap-2"
              data-testid="resume-button"
            >
              <Play className="w-4 h-4" />
              Resume
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => activeExecutionId && stopExecution(activeExecutionId)}
              className="gap-2"
              data-testid="stop-button"
            >
              <Stop className="w-4 h-4" />
              Stop
            </Button>
          </>
        )}
      </div>
    );
  };

  /**
   * Render log entry
   */
  const LogEntry: React.FC<{
    log: {
      timestamp: Date;
      level: 'info' | 'warn' | 'error';
      message: string;
      nodeId?: string;
    };
  }> = ({ log }) => {
    const levelColors = {
      info: 'text-muted-foreground',
      warn: 'text-yellow-600',
      error: 'text-red-600',
    };

    const levelIcons = {
      info: '•',
      warn: '⚠',
      error: '✗',
    };

    return (
      <div className="flex gap-2 text-sm py-1">
        <span className="text-muted-foreground text-xs font-mono shrink-0">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
        <span className={cn(levelColors[log.level])}>
          {levelIcons[log.level]}
        </span>
        <span className="flex-1">{log.message}</span>
        {log.nodeId && (
          <Badge variant="outline" className="text-xs shrink-0">
            {log.nodeId}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Card
      className={cn('w-96 h-full flex flex-col', className)}
      data-testid="execution-panel"
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">Execution</h2>
            {StatusIcon && <StatusIcon className="w-5 h-5 text-muted-foreground" />}
            <Badge variant={statusInfo.variant} className="capitalize">
              {statusInfo.label}
            </Badge>
          </div>
          <ControlButtons />
        </div>

        {/* Progress bar */}
        {isExecuting && (
          <div className="space-y-2">
            <Progress value={progress * 100} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {Math.round(progress * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Execution logs */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {executionLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm mb-2">No execution logs yet</p>
              <p className="text-xs">
                Execute the workflow to see real-time logs here
              </p>
            </div>
          ) : (
            executionLogs.map((log, index) => (
              <LogEntry
                key={`${log.timestamp.toString()}-${index}`}
                log={log}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {activeWorkflow && currentExecutionId && (
        <div className="p-4 border-t text-xs text-muted-foreground">
          Execution ID: {currentExecutionId}
        </div>
      )}
    </Card>
  );
};

export default ExecutionPanel;
