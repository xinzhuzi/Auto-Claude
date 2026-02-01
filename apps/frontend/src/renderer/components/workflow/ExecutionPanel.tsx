/**
 * ExecutionPanel Component
 *
 * Displays workflow execution progress and logs with real-time monitoring
 * Uses tabbed layout to separate execution monitoring and logs
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useActiveWorkflow, useWorkflowStore } from '../../stores/workflow-store';
import { useProjectStore } from '../../stores/project-store';
import { cn } from '../../lib/utils';
import {
  Play,
  Pause,
  Square,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Activity,
  FileText,
  X
} from 'lucide-react';

interface ExecutionPanelProps {
  className?: string;
}

interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentNode?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  nodeId?: string;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ className }) => {
  const { t } = useTranslation('workflowStudio');
  const activeWorkflow = useActiveWorkflow();
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setExecutionPanelOpen = useWorkflowStore((state) => state.setExecutionPanelOpen);

  // Get project path from project store
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const projects = useProjectStore((state) => state.projects);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectPath = selectedProject?.path || null;

  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    progress: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTab, setActiveTab] = useState('monitor');
  const [streamOutput, setStreamOutput] = useState('');
  const cleanupRef = useRef<(() => void)[]>([]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Listen to execution events
  useEffect(() => {
    if (!window.electronAPI?.workflow) return;

    // Progress updates
    const handleProgress = (event: any) => {
      const { executionId: evtExecId, status, progress, currentNode } = event;
      if (executionId && evtExecId === executionId) {
        setExecutionState(prev => ({
          ...prev,
          status: status || prev.status,
          progress: progress || prev.progress,
          currentNode: currentNode || prev.currentNode,
        }));

        // Add log entry
        addLog('info', `进度: ${progress}% - 节点: ${currentNode || '未知'}`, currentNode);
      }
    };

    // Execution complete
    const handleComplete = (event: any) => {
      const { executionId: evtExecId } = event;
      if (executionId && evtExecId === executionId) {
        setExecutionState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
        }));
        addLog('success', '工作流执行完成');
      }
    };

    // Execution failed
    const handleFailed = (event: any) => {
      const { executionId: evtExecId, error } = event;
      if (executionId && evtExecId === executionId) {
        setExecutionState(prev => ({
          ...prev,
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: error || '未知错误',
        }));
        addLog('error', `工作流执行失败: ${error || '未知错误'}`);
      }
    };

    // Node executed
    const handleNodeExecuted = (event: any) => {
      const { executionId: evtExecId, nodeId, nodeName, success, error } = event;
      if (evtExecId === executionId) {
        if (success) {
          addLog('success', `节点 "${nodeName || nodeId}" 执行成功`, nodeId);
        } else {
          addLog('error', `节点 "${nodeName || nodeId}" 执行失败: ${error}`, nodeId);
        }
      }
    };

    // Register event listeners (if available)
    // Note: These would need to be implemented in the preload script
    // For now, we'll use a polling approach to get logs

    return () => {
      // Cleanup listeners
    };
  }, [executionId]);

  // Poll for execution logs
  useEffect(() => {
    if (!executionId || executionState.status === 'idle') return;

    const interval = setInterval(async () => {
      try {
        const result = await window.electronAPI.workflow.getExecutionLogs(executionId);
        if (result.success && result.data) {
          // Parse logs and update (data is string[] from IPC handler)
          const newLogs = (result.data as unknown as string[]).map((logLine: string) => parseLogLine(logLine));
          setLogs(newLogs);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [executionId, executionState.status]);

  const parseLogLine = (logLine: string): LogEntry => {
    // Parse log format: [timestamp] level: message
    const match = logLine.match(/\[([^\]]+)\]\s+(\w+):\s+(.+)/);
    if (match) {
      return {
        timestamp: match[1],
        level: (match[2].toLowerCase() as LogEntry['level']) || 'info',
        message: match[3],
      };
    }
    return {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: logLine,
    };
  };

  const addLog = (level: LogEntry['level'], message: string, nodeId?: string) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId,
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setStreamOutput('');
  };

  const handleExecute = async () => {
    if (!activeWorkflow) return;

    if (!projectPath) {
      addLog('error', '未选择项目，请先选择一个项目');
      return;
    }

    // 验证工作流
    const { validateWorkflow } = await import('../../services/workflow');
    const validation = validateWorkflow(activeWorkflow);
    if (!validation.valid) {
      validation.errors.forEach(err => addLog('error', err));
      return;
    }

    const currentWorkflowName = workflowName || activeWorkflow.name || 'workflow';

    try {
      setExecutionState({
        status: 'running',
        progress: 0,
        startedAt: new Date().toISOString(),
      });
      setLogs([]);
      setStreamOutput('');
      addLog('info', `开始执行工作流: ${currentWorkflowName}`);

      // Clean up any previous listeners
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];

      // 1. First export the workflow to .claude/commands/
      addLog('info', '正在导出工作流到 .claude/commands/...');

      const { generateSlashCommandFile, nodeNameToFileName } = await import('../../services/workflow');
      const { serializeWorkflow } = await import('../../services/workflow');

      const nodes = activeWorkflow.nodes || [];
      const connections = activeWorkflow.connections || [];

      // Debug: 打印节点数据，检查是否包含最新修改
      console.log('[ExecutionPanel] activeWorkflow nodes:', JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, data: n.data })), null, 2));

      const reactFlowNodes = nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data || {},
      }));
      const reactFlowEdges = connections.map((conn: any) => ({
        id: conn.id,
        source: conn.from,
        target: conn.to,
        sourceHandle: conn.fromPort,
        targetHandle: conn.toPort,
      }));

      const workflow = serializeWorkflow(reactFlowNodes, reactFlowEdges, currentWorkflowName);
      const mdContent = generateSlashCommandFile(workflow);
      const fileName = nodeNameToFileName(currentWorkflowName);

      const exportResult = await window.electronAPI.workflow.exportWorkflowToProject(workflow, mdContent, projectPath);
      if (!exportResult.success) {
        throw new Error(exportResult.error || '导出工作流失败');
      }
      addLog('success', `已导出到 .claude/commands/${fileName}.md`);

      // 2. Register command execution event listeners
      // Note: We don't filter by executionId since we only run one workflow at a time
      const unsubOutput = window.electronAPI.workflow.onWorkflowCommandOutput((execId: string, data: string) => {
        console.log('[ExecutionPanel] Received output:', execId, data.length, 'bytes');
        setStreamOutput(prev => prev + data);
        // Also add to logs for visibility
        addLog('info', data.trim());
      });
      cleanupRef.current.push(unsubOutput);

      const unsubComplete = window.electronAPI.workflow.onWorkflowCommandComplete((execId: string) => {
        console.log('[ExecutionPanel] Received complete:', execId);
        setExecutionState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
        }));
        addLog('success', 'Workflow execution completed successfully');
      });
      cleanupRef.current.push(unsubComplete);

      const unsubError = window.electronAPI.workflow.onWorkflowCommandError((execId: string, error: string) => {
        console.log('[ExecutionPanel] Received error:', execId, error);
        setExecutionState(prev => ({
          ...prev,
          status: 'failed',
          error,
          completedAt: new Date().toISOString(),
        }));
        addLog('error', `Execution failed: ${error}`);
      });
      cleanupRef.current.push(unsubError);

      // 3. Execute the command
      addLog('info', `Executing: claude "/${fileName}"`);
      console.log('[ExecutionPanel] Calling executeCommand:', fileName, projectPath);
      const result = await window.electronAPI.workflow.executeCommand(fileName, projectPath);
      console.log('[ExecutionPanel] executeCommand result:', result);

      if (!result.success) {
        setExecutionState(prev => ({ ...prev, status: 'failed', error: result.error }));
        addLog('error', `Failed to start execution: ${result.error}`);
      } else {
        setExecutionId(result.data || null);
        addLog('info', `Execution started with ID: ${result.data}`);
      }
    } catch (error) {
      setExecutionState(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      addLog('error', `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePause = async () => {
    if (!executionId) return;
    try {
      await window.electronAPI.workflow.pauseExecution(executionId);
      setExecutionState(prev => ({ ...prev, status: 'paused' }));
      addLog('warning', 'Execution paused');
    } catch (error) {
      addLog('error', `Failed to pause: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleResume = async () => {
    if (!executionId) return;
    try {
      await window.electronAPI.workflow.resumeExecution(executionId);
      setExecutionState(prev => ({ ...prev, status: 'running' }));
      addLog('info', 'Execution resumed');
    } catch (error) {
      addLog('error', `Failed to resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStop = async () => {
    if (!executionId) return;
    try {
      await window.electronAPI.workflow.stopExecution(executionId);
      setExecutionState(prev => ({ ...prev, status: 'cancelled' }));
      addLog('warning', 'Execution stopped');
    } catch (error) {
      addLog('error', `Failed to stop: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = () => {
    switch (executionState.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'paused':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (executionState.status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      case 'paused':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusVariant = (status: ExecutionState['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'default';
      case 'paused':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: ExecutionState['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredLogs = logs.filter(log =>
    searchQuery === '' || log.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Card className={cn("h-full flex flex-col overflow-hidden", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        {/* Header: Tabs + Controls */}
        <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
          <TabsList>
            <TabsTrigger value="monitor" className="gap-2">
              <Activity className="w-4 h-4" />
              {t('executionPanel.tabs.monitor')}
              {executionState.status !== 'idle' && (
                <Badge variant={getStatusVariant(executionState.status)} className="ml-1">
                  {getStatusText(executionState.status)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="w-4 h-4" />
              {t('executionPanel.tabs.logs')}
              {logs.length > 0 && (
                <Badge variant="secondary" className="ml-1">{logs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Execution Controls - Always visible */}
          <div className="flex items-center gap-2">
            {/* Run/Resume Button */}
            <Button
              size="sm"
              onClick={executionState.status === 'paused' ? handleResume : handleExecute}
              disabled={!activeWorkflow || executionState.status === 'running'}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {executionState.status === 'paused' ? t('executionPanel.resume') : t('executionPanel.run')}
            </Button>

            {/* Pause Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              disabled={executionState.status !== 'running'}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              {t('executionPanel.pause')}
            </Button>

            {/* Stop Button */}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleStop}
              disabled={executionState.status !== 'running' && executionState.status !== 'paused'}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              {t('executionPanel.stop')}
            </Button>

            {/* Close Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExecutionPanelOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {!activeWorkflow ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {t('executionPanel.noWorkflowSelected')}
          </div>
        ) : (
          <>
            {/* Monitor Tab */}
            <TabsContent value="monitor" className="flex-1 p-4 m-0 data-[state=active]:flex flex-col overflow-hidden">
              {/* Compact Status Bar - Fixed height 40px */}
              {executionState.status !== 'idle' && (
                <div className="flex items-center gap-3 h-10 mb-2 shrink-0">
                  {getStatusIcon()}
                  <span className={cn("font-medium", getStatusColor())}>
                    {getStatusText(executionState.status)}
                  </span>
                  {executionState.status === 'running' && (
                    <>
                      <Progress value={executionState.progress} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground">{executionState.progress}%</span>
                      <span className="text-sm text-muted-foreground">{activeWorkflow.nodes?.length || 0} {t('executionPanel.nodes')}</span>
                    </>
                  )}
                </div>
              )}

              {/* Error Display */}
              {executionState.error && (
                <Alert variant="destructive" className="mb-2 shrink-0">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('executionPanel.executionFailed')}</AlertTitle>
                  <AlertDescription>{executionState.error}</AlertDescription>
                </Alert>
              )}

              {/* Output Area - Scrollable */}
              {(executionState.status === 'running' || executionState.status === 'completed' || executionState.status === 'failed' || streamOutput) ? (
                <div className="flex-1 border rounded-lg overflow-auto min-h-0">
                  <pre className="p-4 font-mono text-sm whitespace-pre-wrap bg-muted/50 min-h-full">
                    {streamOutput || (executionState.status === 'running' ? t('executionPanel.waitingForOutput') : t('executionPanel.noOutput'))}
                  </pre>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  {t('executionPanel.clickRunToExecute')}
                </div>
              )}
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="flex-1 p-4 m-0 data-[state=active]:flex flex-col overflow-hidden">
              {/* Search Bar - Fixed height 40px */}
              <div className="flex items-center gap-2 h-10 mb-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('executionPanel.searchLogs')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                  className="h-10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('executionPanel.clear')}
                </Button>
              </div>

              {/* Logs Content - Scrollable */}
              <div className="flex-1 border rounded-md overflow-auto min-h-0">
                <div className="p-2 space-y-1 font-mono text-xs">
                  {filteredLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      {logs.length === 0 ? t('executionPanel.noLogsYet') : t('executionPanel.noMatchingLogs')}
                    </div>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 hover:bg-accent rounded text-sm"
                      >
                        {getLogIcon(log.level)}
                        <span className="text-muted-foreground min-w-[80px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={cn("flex-1 break-all", getLogColor(log.level))}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </Card>
  );
};
