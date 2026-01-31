/**
 * SubAgentDialog Component
 *
 * Dialog for selecting local project agents for SubAgent nodes
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Search, Users, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProjectStore } from '../../stores/project-store';

interface ProjectAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  filePath: string;
}

interface SubAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (agent: ProjectAgent, prompt: string) => void;
  initialData?: {
    agentId?: string;
    prompt?: string;
  };
}

// Category display names
const CATEGORY_NAMES: Record<string, string> = {
  planner: '📋 策划团队',
  art: '🎨 美术团队',
  dev: '💻 开发团队',
  director: '🎬 导演团队',
  general: '📁 其他',
};

export const SubAgentDialog: React.FC<SubAgentDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
  initialData,
}) => {
  const { t } = useTranslation('workflowStudio');
  const activeProject = useProjectStore((state) => state.getActiveProject());

  const [agents, setAgents] = useState<ProjectAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<ProjectAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agents when dialog opens
  useEffect(() => {
    if (open) {
      setPrompt(initialData?.prompt || '');
      loadAgents();
    }
  }, [open, initialData]);

  // Pre-select agent if initialData provided
  useEffect(() => {
    if (initialData?.agentId && agents.length > 0) {
      const agent = agents.find((a) => a.id === initialData.agentId);
      if (agent) {
        setSelectedAgent(agent);
      }
    }
  }, [initialData?.agentId, agents]);

  const loadAgents = async () => {
    if (!activeProject?.path) {
      setError('请先选择一个项目');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.workflow.listAgentsFromProject(activeProject.path);
      if (result.success && result.data) {
        setAgents(result.data);
        if (result.data.length === 0) {
          setError('该项目没有配置 Agent，请在 .claude/agents/ 目录下添加 Agent 定义文件');
        }
      } else {
        setError(result.error || '加载 Agent 列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Agent 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedAgent) {
      setError('请选择一个 Agent');
      return;
    }

    onSelect(selectedAgent, prompt);
    onOpenChange(false);
  };

  // Filter agents by search query
  const filteredAgents = agents.filter(
    (agent) =>
      searchQuery === '' ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group agents by category
  const groupedAgents = filteredAgents.reduce((acc, agent) => {
    const category = agent.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(agent);
    return acc;
  }, {} as Record<string, ProjectAgent[]>);

  // Sort categories
  const sortedCategories = Object.keys(groupedAgents).sort((a, b) => {
    const order = ['planner', 'art', 'dev', 'director', 'general'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>配置 Sub-Agent 节点</DialogTitle>
        </DialogHeader>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Panel - Agent List */}
          <div className="w-80 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">项目 Agent 列表</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={loadAgents}
                disabled={loading}
              >
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="搜索 Agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>
            <ScrollArea className="h-[calc(100%-4rem)]">
              {loading ? (
                <div className="text-xs text-muted-foreground p-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    加载中...
                  </div>
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-xs text-muted-foreground p-2 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-4 w-4" />
                    没有找到 Agent
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedCategories.map((category) => (
                    <div key={category}>
                      <div className="text-xs font-medium text-muted-foreground mb-1 px-1">
                        {CATEGORY_NAMES[category] || category}
                      </div>
                      <div className="space-y-1">
                        {groupedAgents[category].map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent)}
                            className={cn(
                              'w-full text-left p-2 rounded-md transition-colors',
                              'hover:bg-accent',
                              selectedAgent?.id === agent.id && 'bg-accent ring-1 ring-primary'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {agent.icon && <span className="text-sm">{agent.icon}</span>}
                              <span className="text-sm font-medium truncate">{agent.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate pl-5">
                              {agent.id}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Agent Details & Prompt */}
          <div className="flex-1 flex flex-col space-y-3 border-l pl-4 min-w-0">
            {!selectedAgent ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                ← 请先选择一个 Agent
              </div>
            ) : (
              <>
                {/* Selected Agent Info */}
                <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                  <div className="flex items-center gap-2">
                    {selectedAgent.icon && <span className="text-lg">{selectedAgent.icon}</span>}
                    <span className="font-medium">{selectedAgent.name}</span>
                    <span className="text-xs text-muted-foreground">({selectedAgent.id})</span>
                  </div>
                  {selectedAgent.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {selectedAgent.description}
                    </p>
                  )}
                </div>

                {/* Task Prompt */}
                <div className="flex-1 flex flex-col space-y-2">
                  <h4 className="text-sm font-medium">任务描述</h4>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述您希望这个 Agent 完成的任务..."
                    className="flex-1 text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    任务描述将作为 Agent 的输入，指导其完成特定工作
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedAgent}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
