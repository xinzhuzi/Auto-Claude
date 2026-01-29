/**
 * Skill Browser Dialog
 * ====================
 *
 * Dialog for browsing and selecting Claude Code Skills to add to workflow.
 * Supports user, project, and local skill scopes.
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
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Search, RefreshCw, Plus, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProjectStore } from '../../stores/project-store';
import { SkillCreationDialog } from './SkillCreationDialog';

interface SkillReference {
  name: string;
  description: string;
  skillPath: string;
  scope: 'user' | 'project' | 'local';
  validationStatus: 'valid' | 'missing' | 'invalid';
  allowedTools?: string;
  source?: string;
}

interface SkillBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSkill: (skill: SkillReference) => void;
}

export const SkillBrowserDialog: React.FC<SkillBrowserDialogProps> = ({
  open,
  onOpenChange,
  onSelectSkill,
}) => {
  const { t } = useTranslation('workflowStudio');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSkills, setUserSkills] = useState<SkillReference[]>([]);
  const [projectSkills, setProjectSkills] = useState<SkillReference[]>([]);
  const [localSkills, setLocalSkills] = useState<SkillReference[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillReference | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'project' | 'local'>('user');
  const [filterText, setFilterText] = useState('');
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);

  // Get active project path
  const activeProject = useProjectStore((state) => state.getActiveProject());
  const projectPath = activeProject?.path;

  // Load skills when dialog opens
  useEffect(() => {
    if (open) {
      loadSkills();
    }
  }, [open, projectPath]);

  const loadSkills = async () => {
    setLoading(true);
    setError(null);
    setSelectedSkill(null);

    try {
      // Call IPC to get real skills from local directories
      // Pass projectPath to scan project-specific skills
      const result = await window.electronAPI.browseSkills(projectPath);

      if (!result.success) {
        throw new Error(result.error || t('action.loadFailed'));
      }

      const user = result.data?.user || [];
      const project = result.data?.project || [];
      const local = result.data?.local || [];

      setUserSkills(user);
      setProjectSkills(project);
      setLocalSkills(local);

      // Switch to tab with skills if current tab is empty
      if (user.length === 0) {
        if (project.length > 0) {
          setActiveTab('project');
        } else if (local.length > 0) {
          setActiveTab('local');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('action.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSkills();
    setRefreshing(false);
  };

  const handleAddSkill = () => {
    if (!selectedSkill) {
      setError(t('action.noSelection'));
      return;
    }

    onSelectSkill(selectedSkill);
    handleClose();
  };

  const handleClose = () => {
    setSelectedSkill(null);
    setError(null);
    setFilterText('');
    onOpenChange(false);
  };

  // Filter skills
  const filterLower = filterText.toLowerCase().trim();
  const filteredUserSkills = filterLower
    ? userSkills.filter((skill) => skill.name.toLowerCase().includes(filterLower))
    : userSkills;
  const filteredProjectSkills = filterLower
    ? projectSkills.filter((skill) => skill.name.toLowerCase().includes(filterLower))
    : projectSkills;
  const filteredLocalSkills = filterLower
    ? localSkills.filter((skill) => skill.name.toLowerCase().includes(filterLower))
    : localSkills;

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'user':
        return 'bg-blue-500';
      case 'project':
        return 'bg-green-500';
      case 'local':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'user':
        return t('browser.userTab');
      case 'project':
        return t('browser.projectTab');
      case 'local':
        return t('browser.localTab');
      default:
        return scope;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('nodes.skill.label')}</DialogTitle>
          <DialogDescription>
            {t('nodes.skill.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Search and Refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('browser.filterPlaceholder')}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title={t('action.refresh')}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="user">
                {t('browser.userTab')} ({filteredUserSkills.length})
              </TabsTrigger>
              <TabsTrigger value="project">
                {t('browser.projectTab')} ({filteredProjectSkills.length})
              </TabsTrigger>
              <TabsTrigger value="local">
                {t('browser.localTab')} ({filteredLocalSkills.length})
              </TabsTrigger>
            </TabsList>

            {/* Scope Description */}
            <Alert className="mt-2">
              <AlertDescription className="text-xs">
                {activeTab === 'user' && t('browser.userDescription')}
                {activeTab === 'project' && t('browser.projectDescription')}
                {activeTab === 'local' && t('browser.localDescription')}
              </AlertDescription>
            </Alert>

            {/* Loading State */}
            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Skills List */}
            {!loading && !error && (
              <>
                <TabsContent value="user" className="flex-1 mt-2 min-h-0">
                  <SkillsList
                    skills={filteredUserSkills}
                    selectedSkill={selectedSkill}
                    onSelectSkill={setSelectedSkill}
                    getValidationIcon={getValidationIcon}
                    getScopeBadgeColor={getScopeBadgeColor}
                    getScopeLabel={getScopeLabel}
                    noSkillsText={t('browser.noSkills')}
                  />
                </TabsContent>
                <TabsContent value="project" className="flex-1 mt-2 min-h-0">
                  <SkillsList
                    skills={filteredProjectSkills}
                    selectedSkill={selectedSkill}
                    onSelectSkill={setSelectedSkill}
                    getValidationIcon={getValidationIcon}
                    getScopeBadgeColor={getScopeBadgeColor}
                    getScopeLabel={getScopeLabel}
                    noSkillsText={t('browser.noSkills')}
                  />
                </TabsContent>
                <TabsContent value="local" className="flex-1 mt-2 min-h-0">
                  <SkillsList
                    skills={filteredLocalSkills}
                    selectedSkill={selectedSkill}
                    onSelectSkill={setSelectedSkill}
                    getValidationIcon={getValidationIcon}
                    getScopeBadgeColor={getScopeBadgeColor}
                    getScopeLabel={getScopeLabel}
                    noSkillsText={t('browser.noSkills')}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        <DialogFooter className="flex-row justify-between">
          <Button variant="outline" onClick={() => setIsCreationDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('creation.createButton')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddSkill} disabled={!selectedSkill || loading}>
              {t('browser.selectButton')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Skill Creation Dialog */}
      <SkillCreationDialog
        open={isCreationDialogOpen}
        onOpenChange={setIsCreationDialogOpen}
        onSuccess={loadSkills}
      />
    </Dialog>
  );
};

// Skills List Component
interface SkillsListProps {
  skills: SkillReference[];
  selectedSkill: SkillReference | null;
  onSelectSkill: (skill: SkillReference) => void;
  getValidationIcon: (status: string) => React.ReactNode;
  getScopeBadgeColor: (scope: string) => string;
  getScopeLabel: (scope: string) => string;
  noSkillsText: string;
}

const SkillsList: React.FC<SkillsListProps> = ({
  skills,
  selectedSkill,
  onSelectSkill,
  getValidationIcon,
  getScopeBadgeColor,
  getScopeLabel,
  noSkillsText,
}) => {
  if (skills.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {noSkillsText}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full border rounded-md">
      <div className="p-2 space-y-2">
        {skills.map((skill) => (
          <button
            key={skill.skillPath}
            onClick={() => onSelectSkill(skill)}
            className={cn(
              'w-full text-left p-3 rounded-md border transition-colors',
              'hover:bg-accent hover:border-primary',
              selectedSkill?.skillPath === skill.skillPath && 'bg-accent border-primary'
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{skill.name}</span>
                <Badge className={cn('text-xs', getScopeBadgeColor(skill.scope))}>
                  {getScopeLabel(skill.scope)}
                </Badge>
                {skill.source && (
                  <Badge variant="outline" className="text-xs">
                    {skill.source}
                  </Badge>
                )}
              </div>
              {getValidationIcon(skill.validationStatus)}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{skill.description}</p>
            {skill.allowedTools && (
              <p className="text-xs text-muted-foreground">
                {skill.allowedTools}
              </p>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
