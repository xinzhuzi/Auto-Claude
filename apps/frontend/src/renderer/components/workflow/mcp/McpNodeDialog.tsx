/**
 * McpNodeDialog Component
 *
 * Combined dialog for selecting MCP server/tool and configuring parameters
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import { Textarea } from '../../ui/textarea';
import { Search, Server, RefreshCw, AlertCircle, Sparkles, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  listMcpServers,
  getMcpTools,
  refreshMcpCache,
} from '../../../services/mcp';

interface McpServer {
  id: string;
  name: string;
  description?: string;
  connected: boolean;
  scope?: string;
  source?: string;
}

interface McpTool {
  name: string;
  description?: string;
  serverId: string;
  inputSchema?: any;
}

type ConfigMode = 'aiParameterConfig' | 'aiToolSelection';

interface McpNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (serverId: string, toolName: string, config: {
    mode: ConfigMode;
    aiParameterConfig?: { description: string };
    aiToolSelectionConfig?: { taskDescription: string };
  }) => void;
  initialData?: {
    serverId?: string;
    toolName?: string;
    mode?: ConfigMode;
    aiParameterConfig?: { description: string };
    aiToolSelectionConfig?: { taskDescription: string };
  };
}

export const McpNodeDialog: React.FC<McpNodeDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
  initialData,
}) => {
  const { t } = useTranslation('workflowStudio');

  // Mode state
  const [mode, setMode] = useState<ConfigMode>('aiParameterConfig');

  // Server/Tool selection state
  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parameter state
  const [aiParameterDescription, setAiParameterDescription] = useState('');
  const [aiTaskDescription, setAiTaskDescription] = useState('');
  const [serverTools, setServerTools] = useState<McpTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData?.serverId && initialData?.toolName) {
        setSelectedServer(initialData.serverId);
        setMode(initialData.mode || 'aiParameterConfig');
        setAiParameterDescription(initialData.aiParameterConfig?.description || '');
        setAiTaskDescription(initialData.aiToolSelectionConfig?.taskDescription || '');
      } else {
        setMode('aiParameterConfig');
        setSelectedServer(null);
        setSelectedTool(null);
        setAiParameterDescription('');
        setAiTaskDescription('');
      }
      loadAllTools();
    }
  }, [open, initialData]);

  // Load tool schema when tool is selected
  useEffect(() => {
    if (selectedTool) {
      loadServerTools(selectedTool.serverId);
    }
  }, [selectedTool?.serverId]);

  // Load tools for selected server
  const loadServerTools = async (serverId: string) => {
    setLoadingTools(true);
    try {
      const toolsResult = await getMcpTools({ serverId });
      if (toolsResult.success && toolsResult.tools) {
        setServerTools(toolsResult.tools.map(t => ({
          name: t.name,
          description: t.description,
          serverId,
        })));
      } else {
        setServerTools([]);
      }
    } catch {
      setServerTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  // Load all MCP servers (display server names, not individual tools)
  const loadAllTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const serverResult = await listMcpServers();
      if (!serverResult.success || !serverResult.servers) {
        setError(serverResult.error || 'Failed to load MCP servers');
        setTools([]);
        return;
      }

      // Display servers as selectable items
      const serverList = serverResult.servers.map((server) => ({
        name: server.name,
        description: server.scope,
        serverId: server.id,
      }));

      setTools(serverList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP servers');
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshMcpCache();
      await loadAllTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleToolClick = (tool: McpTool) => {
    setSelectedTool(tool);
    setServerTools([]);
  };

  const handleConfirm = () => {
    if (mode === 'aiToolSelection') {
      if (!aiTaskDescription.trim()) {
        setError('任务描述是必填项');
        return;
      }
      onSelect('', '', {
        mode,
        aiToolSelectionConfig: { taskDescription: aiTaskDescription },
      });
    } else {
      if (!selectedTool) {
        setError('请选择服务器');
        return;
      }

      if (!aiParameterDescription.trim()) {
        setError('参数描述是必填项');
        return;
      }

      onSelect(selectedTool.serverId, selectedTool.name, {
        mode,
        aiParameterConfig: { description: aiParameterDescription },
      });
    }

    onOpenChange(false);
  };

  const filteredTools = tools.filter(
    (tool) =>
      searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canConfirm = () => {
    if (mode === 'aiToolSelection') {
      return aiTaskDescription.trim().length > 0;
    }
    return selectedTool && aiParameterDescription.trim().length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[700px] flex flex-col">
        <DialogHeader>
          <DialogTitle>配置 MCP 节点</DialogTitle>
          <DialogDescription>
            选择配置模式，然后根据需要选择工具和填写参数
          </DialogDescription>
        </DialogHeader>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Panel - Mode Selection */}
          <div className="w-56 flex-shrink-0 space-y-2">
            <h4 className="text-sm font-medium mb-3">配置模式</h4>

            <button
              onClick={() => setMode('aiParameterConfig')}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 transition-all',
                mode === 'aiParameterConfig'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-transparent hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">AI 填参数</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                选择服务器，AI 根据描述填参数
              </p>
            </button>

            <button
              onClick={() => setMode('aiToolSelection')}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 transition-all',
                mode === 'aiToolSelection'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-transparent hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">AI 全自动</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                描述任务，AI 选服务器和参数
              </p>
            </button>
          </div>

          {/* Middle Panel - Tool Selection (hidden for AI auto mode) */}
          {mode !== 'aiToolSelection' && (
            <div className="flex-1 flex gap-4 min-h-0 border-l pl-4">
              {/* All Tools List */}
              <div className="w-72 flex-shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">MCP 服务器</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="搜索服务器..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-sm"
                  />
                </div>
                <ScrollArea className="h-[calc(100%-4rem)]">
                  {loading ? (
                    <div className="text-xs text-muted-foreground p-2 text-center">
                      加载中...
                    </div>
                  ) : filteredTools.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2 text-center">
                      没有可用的服务器
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredTools.map((tool) => (
             <button
                          key={`${tool.serverId}:${tool.name}`}
                          onClick={() => handleToolClick(tool)}
                          className={cn(
                            'w-full text-left p-2 rounded-md transition-colors',
                            'hover:bg-accent',
                            selectedTool?.name === tool.name && selectedTool?.serverId === tool.serverId && 'bg-accent ring-1 ring-primary'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Server className="h-3 w-3 flex-shrink-0 text-primary" />
                            <span className="text-sm font-medium truncate">{tool.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {tool.serverId}
                          </div>
                          {tool.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Right Panel - Server Details & Parameter Description */}
              <div className="flex-1 space-y-3 border-l pl-4 min-w-0 overflow-hidden">
                {!selectedTool ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    ← 请先选择一个服务器
                  </div>
                ) : (
                  <>
                    {/* Server Capabilities Description */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">{selectedTool.name} 详情</h4>
                      <ScrollArea className="h-40 border rounded-md p-3 bg-muted/30">
                        {loadingTools ? (
                          <div className="text-xs text-muted-foreground text-center py-2">加载中...</div>
                        ) : serverTools.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-2">暂无详情</div>
                        ) : (
                          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                            {serverTools.map((tool) => (
                              <li key={tool.name}>
                                <span className="font-medium text-foreground">{tool.name}</span>
                                {tool.description ? ` - ${tool.description}` : ' - 暂无描述'}
                              </li>
                            ))}
                          </ul>
                        )}
                      </ScrollArea>
                    </div>

                    {/* Task Description */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">任务描述 <span className="text-destructive">*</span></h4>
                      <Textarea
                        value={aiParameterDescription}
                        onChange={(e) => setAiParameterDescription(e.target.value)}
                        placeholder={"例如：读取 /path/to/file.txt 文件内容"}
                        rows={4}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        描述您想要完成的任务，AI 会自动选择合适的方法并填写参数
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* AI Auto Mode - Task Description */}
          {mode === 'aiToolSelection' && (
            <div className="flex-1 border-l pl-4 space-y-3">
              <h4 className="text-sm font-medium">任务描述</h4>
              <Textarea
                value={aiTaskDescription}
                onChange={(e) => setAiTaskDescription(e.target.value)}
                placeholder={"描述您想要完成的任务，例如：\n\n读取 /Users/test/config.json 文件的内容\n\n或者：\n\n在当前目录创建一个名为 output.txt 的文件，内容为上一步的处理结果"}
                rows={12}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                AI 会根据任务描述自动选择合适的 MCP 服务器、工具，并填写相应的参数
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm()}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
