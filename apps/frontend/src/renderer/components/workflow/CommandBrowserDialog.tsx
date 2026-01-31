/**
 * Command Browser Dialog
 * ======================
 *
 * Dialog for browsing and selecting Claude Code Commands to add to workflow.
 * Scans .claude/commands/ directory in the project.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Search, RefreshCw, Terminal, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProjectStore } from '../../stores/project-store';

interface CommandReference {
  name: string;
  description: string;
  commandPath: string;
  validationStatus: 'valid' | 'missing' | 'invalid';
}

interface CommandBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCommand: (command: CommandReference) => void;
}

/**
 * Get validation status icon
 */
function getValidationIcon(status: 'valid' | 'missing' | 'invalid') {
  switch (status) {
    case 'valid':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'missing':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'invalid':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

export const CommandBrowserDialog: React.FC<CommandBrowserDialogProps> = ({
  open,
  onOpenChange,
  onSelectCommand,
}) => {
  const { t } = useTranslation('workflowStudio');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commands, setCommands] = useState<CommandReference[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<CommandReference | null>(null);
  const [filterText, setFilterText] = useState('');

  // Get active project path
  const activeProject = useProjectStore((state) => state.getActiveProject());
  const projectPath = activeProject?.path;

  // Load commands when dialog opens
  useEffect(() => {
    if (open) {
      loadCommands();
    }
  }, [open, projectPath]);

  const loadCommands = async () => {
    if (!projectPath) {
      setError(t('commandBrowser.noProject', '请先选择项目'));
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedCommand(null);

    try {
      const result = await window.electronAPI.workflow.listCommandsFromProject(projectPath);

      if (!result.success) {
        throw new Error(result.error || t('commandBrowser.loadFailed', '加载命令失败'));
      }

      setCommands(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('commandBrowser.loadFailed', '加载命令失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCommands();
    setRefreshing(false);
  };

  const handleSelect = () => {
    if (selectedCommand) {
      onSelectCommand(selectedCommand);
      onOpenChange(false);
    }
  };

  // Filter commands
  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(filterText.toLowerCase()) ||
    cmd.description.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {t('commandBrowser.title', '选择快捷命令')}
          </DialogTitle>
          <DialogDescription>
            {t('commandBrowser.description', '从项目 .claude/commands/ 目录中选择一个命令')}
          </DialogDescription>
        </DialogHeader>

        {/* Search and Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('commandBrowser.filterPlaceholder', '按命令名称筛选...')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Commands List */}
        <ScrollArea className="h-[400px] border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCommands.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <Terminal className="h-12 w-12 mb-2 opacity-50" />
              <p>{t('commandBrowser.noCommands', '未找到命令')}</p>
              <p className="text-sm mt-1">
                {t('commandBrowser.noCommandsHint', '在 .claude/commands/ 目录中创建 .md 文件')}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => setSelectedCommand(cmd)}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-colors',
                    'hover:bg-accent',
                    selectedCommand?.name === cmd.name && 'bg-accent border-2 border-primary'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Terminal className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">/{cmd.name}</span>
                        {getValidationIcon(cmd.validationStatus)}
                      </div>
                      {cmd.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {cmd.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel', '取消')}
          </Button>
          <Button onClick={handleSelect} disabled={!selectedCommand}>
            {t('commandBrowser.selectButton', '添加到工作流')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

CommandBrowserDialog.displayName = 'CommandBrowserDialog';
