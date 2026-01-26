/**
 * Skill Browser Dialog
 * ====================
 *
 * Dialog for browsing and selecting Claude Code Skills to add to workflow.
 * Supports user, project, and local skill scopes.
 */

import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSkills, setUserSkills] = useState<SkillReference[]>([]);
  const [projectSkills, setProjectSkills] = useState<SkillReference[]>([]);
  const [localSkills, setLocalSkills] = useState<SkillReference[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillReference | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'project' | 'local'>('user');
  const [filterText, setFilterText] = useState('');

  // Load skills when dialog opens
  useEffect(() => {
    if (open) {
      loadSkills();
    }
  }, [open]);

  const loadSkills = async () => {
    setLoading(true);
    setError(null);
    setSelectedSkill(null);

    try {
      // TODO: Call IPC to get skills
      // For now, use mock data
      const mockSkills: SkillReference[] = [
        {
          name: 'code-review',
          description: 'Review code for bugs and improvements',
          skillPath: '~/.claude/skills/code-review',
          scope: 'user',
          validationStatus: 'valid',
          allowedTools: 'Read, Grep, Bash',
        },
        {
          name: 'test-generator',
          description: 'Generate unit tests for code',
          skillPath: '~/.claude/skills/test-generator',
          scope: 'user',
          validationStatus: 'valid',
          allowedTools: 'Read, Write, Bash',
        },
        {
          name: 'refactor-helper',
          description: 'Help refactor code for better structure',
          skillPath: './.c/skills/refactor-helper',
          scope: 'project',
          validationStatus: 'valid',
          allowedTools: 'Read, Edit, Grep',
          source: 'claude',
        },
        {
          name: 'api-documenter',
          description: 'Generate API documentation',
          skillPath: './skills/api-documenter',
          scope: 'local',
          validationStatus: 'valid',
          allowedTools: 'Read, Write',
        },
      ];

      const user = mockSkills.filter((s) => s.scope === 'user');
      const project = mockSkills.filter((s) => s.scope === 'project');
      const local = mockSkills.filter((s) => s.scope === 'local');

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
      setError(err instanceof Error ? err.message : 'Failed to load skills');
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
      setError('Please select a skill');
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

  const currentSkills =
    activeTab === 'user'
      ? filteredUserSkills
      : activeTab === 'project'
        ? filteredProjectSkills
        : filteredLocalSkills;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Skills</DialogTitle>
          <DialogDescription>
            Select a Claude Code Skill to add to your workflow
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Search and Refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
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
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="user">
                User ({filteredUserSkills.length})
              </TabsTrigger>
              <TabsTrigger value="project">
                Project ({filteredProjectSkills.length})
              </TabsTrigger>
              <TabsTrigger value="local">
                Local ({filteredLocalSkills.length})
              </TabsTrigger>
          </TabsList>

            {/* Scope Description */}
            <Alert className="mt-2">
              <AlertDescription className="text-xs">
                {activeTab === 'user' && 'User skills are stored in your home directory and available across all projects'}
                {activeTab === 'project' && 'Project skills are stored in the project .claude directory and shared with team'}
                {activeTab === 'local' && 'Local skills are stored in the project but not committed to version control'}
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
                  />
                </TabsContent>
                <TabsContent value="project" className="flex-1 mt-2 min-h-0">
                  <SkillsList
                    skills={filteredProjectSkills}
                    selectedSkill={selectedSkill}
                    onSelectSkill={setSelectedSkill}
                    getValidationIcon={getValidationIcon}
                    getScopeBadgeColor={getScopeBadgeColor}
                  />
                </TabsContent>
                <TabsContent value="local" className="flex-1 mt-2 min-h-0">
                  <SkillsList
                    skills={filteredLocalSkills}
                    selectedSkill={selectedSkill}
                    onSelectSkill={setSelectedSkill}
                    getValidationIcon={getValidationIcon}
                    getScopeBadgeColor={getScopeBadgeColor}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        <DialogFooter className="flex-row justify-between">
          <Button variant="outline" onClick={() => {}}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Skill
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={!selectedSkill || loading}>
              Add Skill
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
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
}

const SkillsList: React.FC<SkillsListProps> = ({
  skills,
  selectedSkill,
  onSelectSkill,
  getValidationIcon,
  getScopeBadgeColor,
}) => {
  if (skills.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No skills found
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
                  {skill.scope}
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
                Tools: {skill.allowedTools}
              </p>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
