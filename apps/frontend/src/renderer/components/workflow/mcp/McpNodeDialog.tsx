/**
 * McpNodeDialog Component
 *
 * Dialog for selecting MCP tools from available servers
 */

import React, { useState, useEffect } from 'react';
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
import { Search, Server, Tool } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface McpServer {
  id: string;
  name: string;
  description?: string;
  connected: boolean;
}

interface McpTool {
  name: string;
  description?: string;
  serverId: string;
  inputSchema?: any;
}

interface McpNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (serverId: string, toolName: string, tool: McpTool) => void;
}

export const McpNodeDialog: React.FC<McpNodeDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Load MCP servers when dialog opens
  useEffect(() => {
    if (open) {
      loadServers();
    }
  }, [open]);

  // Load tools when server is selected
  useEffect(() => {
    if (selectedServer) {
      loadTools(selectedServer);
    }
  }, [selectedServer]);

  const loadServers = async () => {
    setLoading(true);
    try {
      // TODO: Call IPC to get MCP servers
      // For now, use mock data
      const mockServers: McpServer[] = [
        {
          id: 'filesystem',
          name: 'Filesystem',
          description: 'File system operations',
          connected: true,
        },
        {
          id: 'github',
          name: 'GitHub',
          description: 'GitHub API operations',
          connected: true,
        },
        {
          id: 'database',
          name: 'Database',
          description: 'Database operations',
          connected: false,
        },
      ];
      setServers(mockServers);
      if (mockServers.length > 0) {
        setSelectedServer(mockServers[0].id);
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async (serverId: string) => {
    setLoading(true);
    try {
      // TODO: Call IPC to get MCP tools for server
      // For now, use mock data
      const mockTools: Record<string, McpTool[]> = {
        filesystem: [
          {
            name: 'read_file',
            description: 'Read contents of a file',
            serverId: 'filesystem',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path' },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: 'Write contents to a file',
            serverId: 'filesystem',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path' },
                content: { type: 'string', description: 'File content' },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'list_directory',
            description: 'List files in a directory',
            serverId: 'filesystem',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path' },
              },
              required: ['path'],
            },
          },
        ],
        github: [
          {
            name: 'create_issue',
            description: 'Create a new GitHub issue',
            serverId: 'github',
            inputSchema: {
              type: 'object',
              properties: {
                repo: { type: 'string', description: 'Repository name' },
                title: { type: 'string', description: 'Issue title' },
                body: { type: 'string', description: 'Issue body' },
              },
              required: ['repo', 'title'],
            },
          },
          {
            name: 'list_issues',
            description: 'List issues in a repository',
            serverId: 'github',
            inputSchema: {
              type: 'object',
              properties: {
                repo: { type: 'string', description: 'Repository name' },
                state: { type: 'string', description: 'Issue state (open/closed)' },
              },
              required: ['repo'],
            },
          },
        ],
        database: [],
      };
      setTools(mockTools[serverId] || []);
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTool = (tool: McpTool) => {
    onSelect(tool.serverId, tool.name, tool);
    onOpenChange(false);
  };

  const filteredTools = tools.filter(
    (tool) =>
      searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select MCP Tool</DialogTitle>
          <DialogDescription>
            Choose an MCP server and tool to add to your workflow
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Server List */}
          <div className="w-64 border-r pr-4 space-y-2">
            <h4 className="text-sm font-medium">MCP Servers</h4>
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {servers.map((server) => (
                  <button
                    key={server.id}
                    onClick={() => setSelectedServer(server.id)}
                    disabled={!server.connected}
                    className={cn(
                      'w-full text-left p-3 rounded-md transition-colors',
                      'hover:bg-accent',
                      selectedServer === server.id && 'bg-accent',
                      !server.connected && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Server className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{server.name}</div>
                        {server.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {server.description}
                          </div>
                        )}
                        {!server.connected && (
                          <div className="text-xs text-destructive mt-1">
                            Not connected
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Tool List */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tools */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-sm text-muted-foreground">Loading tools...</div>
                </div>
              ) : filteredTools.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? 'No matching tools found' : 'No tools available'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => handleSelectTool(tool)}
                      className={cn(
                        'w-full text-left p-3 rounded-md border transition-colors',
                        'hover:bg-accent hover:border-primary'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Wrench className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{tool.name}</div>
                          {tool.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {tool.description}
                            </div>
                          )}
                          {tool.inputSchema?.required && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Required: {tool.inputSchema.required.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
