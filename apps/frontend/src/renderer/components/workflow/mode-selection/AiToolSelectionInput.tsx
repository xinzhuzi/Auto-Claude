/**
 * AI Tool Selection Input
 * ========================
 *
 * Component for selecting which tools the AI can use during execution.
 * Supports MCP tools, Skills, and built-in tools.
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolSelection {
  mcpTools: string[];
  skills: string[];
  builtInTools: string[];
}

interface AiToolSelectionInputProps {
  value: ToolSelection;
  onChange: (selection: ToolSelection) => void;
  availableMcpTools?: string[];
  availableSkills?: string[];
  availableBuiltInTools?: string[];
  disabled?: boolean;
  className?: string;
}

export const AiToolSelectionInput: React.FC<AiToolSelectionInputProps> = ({
  value,
  onChange,
  availableMcpTools = [],
  availableSkills = [],
  availableBuiltInTools = ['read', 'write', 'bash', 'grep', 'glob'],
  disabled = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'mcp' | 'skills' | 'builtin'>('mcp');

  const handleMcpToolToggle = (tool: string) => {
    const newMcpTools = value.mcpTools.includes(tool)
      ? value.mcpTools.filter(t => t !== tool)
      : [...value.mcpTools, tool];
    onChange({ ...value, mcpTools: newMcpTools });
  };

  const handleSkillToggle = (skill: string) => {
    const newSkills = value.skills.includes(skill)
      ? value.skills.filter(s => s !== skill)
      : [...value.skills, skill];
    onChange({ ...value, skills: newSkills });
  };

  const handleBuiltInToolToggle = (tool: string) => {
    const newBuiltInTools = value.builtInTools.includes(tool)
      ? value.builtInTools.filter(t => t !== tool)
      : [...value.builtInTools, tool];
    onChange({ ...value, builtInTools: newBuiltInTools });
  };

  const filterTools = (tools: string[]) => {
    if (!searchQuery) return tools;
    return tools.filter(tool => 
      tool.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderToolList = () => {
    let tools: string[] = [];
    let selectedTools: string[] = [];
    let onToggle: (tool: string) => void;

    switch (activeTab) {
      case 'mcp':
        tools = filterTools(availableMcpTools);
        selectedTools = value.mcpTools;
        onToggle = handleMcpToolToggle;
        break;
      case 'skills':
        tools = filterTools(availableSkills);
        selectedTools = value.skills;
        onToggle = handleSkillToggle;
        break;
      case 'builtin':
        tools = filterTools(availableBuiltInTools);
        selectedTools = value.builtInTools;
        onToggle = handleBuiltInToolToggle;
        break;
    }

    if (tools.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No tools available
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {tools.map(tool => (
          <div key={tool} className="flex items-center space-x-2">
            <Checkbox
              id={`tool-${tool}`}
              checked={selectedTools.includes(tool)}
              onCheckedChange={() => onToggle(tool)}
              disabled={disabled}
            />
            <Label
              htmlFor={`tool-${tool}`}
              className="text-sm font-normal cursor-pointer flex-1"
            >
              {tool}
            </Label>
          </div>
        ))}
      </div>
    );
  };

  const totalSelected = value.mcpTools.length + value.skills.length + value.builtInTools.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label>Tool Selection</Label>
        <Badge variant="secondary">
          {totalSelected} selected
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
          disabled={disabled}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'mcp' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('mcp')}
          disabled={disabled}
        >
          MCP Tools
          {value.mcpTools.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {value.mcpTools.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'skills' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('skills')}
          disabled={disabled}
        >
          Skills
          {value.skills.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {value.skills.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'builtin' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('builtin')}
          disabled={disabled}
        >
          Built-in
          {value.builtInTools.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {value.builtInTools.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Tool List */}
      <div className="max-h-64 overflow-y-auto border rounded-md p-4">
        {renderToolList()}
      </div>
    </div>
  );
};
