/**
 * MCP Workflow Studio Handlers
 *
 * IPC handlers for MCP operations in the workflow editor.
 * Adapted from cc-wf-studio for Auto-Claude Electron environment.
 *
 * Reads MCP server configurations from:
 * - Claude Code: ~/.mcp.json, <project>/.mcp.json, ~/.claude.json
 * - VSCode Copilot: .vscode/mcp.json
 * - Copilot CLI: ~/.copilot/mcp-config.json
 * - Codex CLI: ~/.codex/config.toml
 */

import { ipcMain } from 'electron';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'child_process';
import { IPC_CHANNELS } from '../../shared/constants/ipc';
import { appLog } from '../app-logger';
import { getConfiguredPythonPath } from '../python-env-manager';

// ============================================================================
// Types
// ============================================================================

interface McpServerConfig {
  type?: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

interface McpServer {
  id: string;
  name: string;
  type: 'http' | 'command';
  url?: string;
  command?: string;
  args?: string[];
  scope: 'user' | 'project' | 'local';
  source: 'claude' | 'copilot' | 'codex';
}

interface McpToolReference {
  name: string;
  description?: string;
  serverId: string;
}

interface McpToolSchema {
  name: string;
  description?: string;
  parameters?: ToolParameter[];
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  description?: string;
  required?: boolean;
}

// Cache for MCP data
const mcpCache = {
  servers: null as McpServer[] | null,
  tools: new Map<string, McpToolReference[]>(),
  schemas: new Map<string, McpToolSchema>(),
  translatedTools: new Map<string, McpToolReference[]>(),
  lastRefresh: 0,
};

const CACHE_TTL = 60000; // 1 minute

// ============================================================================
// Configuration Reading
// ============================================================================

/**
 * Read JSON config file safely
 */
function readJsonConfig(configPath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    appLog.warn(`[MCP] Failed to read config: ${configPath}`, error);
    return null;
  }
}

/**
 * Normalize server config (infer type if missing)
 */
function normalizeServerConfig(config: Partial<McpServerConfig>): McpServerConfig | null {
  if (config.type) {
    return config as McpServerConfig;
  }

  // Infer type from fields
  if (config.command) {
    return { ...config, type: 'stdio' } as McpServerConfig;
  }

  if (config.url) {
    return { ...config, type: 'http' } as McpServerConfig;
  }

  return null;
}

/**
 * Get all MCP servers from all configuration sources
 */
function getAllMcpServers(projectPath?: string): McpServer[] {
  const servers: McpServer[] = [];
  const seenIds = new Set<string>();

  const addServers = (
    configServers: Record<string, McpServerConfig> | null | undefined,
    source: 'claude' | 'copilot' | 'codex',
    scope: 'user' | 'project' | 'local'
  ) => {
    if (!configServers) return;

    for (const [serverId, config] of Object.entries(configServers)) {
      if (seenIds.has(serverId)) continue;

      const normalized = normalizeServerConfig(config);
      if (!normalized) continue;

      seenIds.add(serverId);
      servers.push({
        id: serverId,
        name: serverId,
        type: normalized.type === 'stdio' ? 'command' : 'http',
        url: normalized.url,
        command: normalized.command,
        args: normalized.args,
        scope,
        source,
      });
    }
  };

  // Add servers from a single .mcp.json file (Claude plugin format - no mcpServers wrapper)
  const addServersFromPluginConfig = (
    configPath: string,
    source: 'claude' | 'copilot' | 'codex',
    scope: 'user' | 'project' | 'local'
  ) => {
    const config = readJsonConfig(configPath);
    if (!config) return;

    // Claude plugin format: { "serverName": { "command": "...", "args": [...] } }
    for (const [serverId, serverConfig] of Object.entries(config)) {
      if (seenIds.has(serverId)) continue;
      if (typeof serverConfig !== 'object' || serverConfig === null) continue;

      const normalized = normalizeServerConfig(serverConfig as McpServerConfig);
      if (!normalized) continue;

      seenIds.add(serverId);
      servers.push({
        id: serverId,
        name: serverId,
        type: normalized.type === 'stdio' ? 'command' : 'http',
        url: normalized.url,
        command: normalized.command,
        args: normalized.args,
        scope,
        source,
      });
    }
  };

  // Priority 0: Claude Code plugins (~/.claude/plugins/cache/*/.mcp.json)
  const claudePluginsDir = path.join(os.homedir(), '.claude', 'plugins', 'cache');
  appLog.info(`[MCP] Scanning Claude plugins directory: ${claudePluginsDir}`);
  if (fs.existsSync(claudePluginsDir)) {
    try {
      const marketplaces = fs.readdirSync(claudePluginsDir);
      appLog.info(`[MCP] Found marketplaces: ${marketplaces.join(', ')}`);
      for (const marketplace of marketplaces) {
        if (marketplace.startsWith('.')) continue; // Skip hidden files
        const marketplacePath = path.join(claudePluginsDir, marketplace);
        if (!fs.statSync(marketplacePath).isDirectory()) continue;

        const plugins = fs.readdirSync(marketplacePath);
        for (const plugin of plugins) {
          if (plugin.startsWith('.')) continue; // Skip hidden files
          const pluginPath = path.join(marketplacePath, plugin);
          if (!fs.statSync(pluginPath).isDirectory()) continue;

          // Check for version directories
          const versions = fs.readdirSync(pluginPath);
          for (const version of versions) {
            if (version.startsWith('.')) continue; // Skip hidden files
            const versionPath = path.join(pluginPath, version);
            if (!fs.statSync(versionPath).isDirectory()) continue;

            const mcpConfigPath = path.join(versionPath, '.mcp.json');
            if (fs.existsSync(mcpConfigPath)) {
              appLog.info(`[MCP] Found MCP config: ${mcpConfigPath}`);
              addServersFromPluginConfig(mcpConfigPath, 'claude', 'user');
            }
          }
        }
      }
    } catch (error) {
      appLog.warn('[MCP] Failed to scan Claude plugins directory:', error);
    }
  }

  // Priority 1: Project-scope Claude Code (<project>/.mcp.json)
  if (projectPath) {
    const projectMcpPath = path.join(projectPath, '.mcp.json');
    const projectMcpConfig = readJsonConfig(projectMcpPath) as { mcpServers?: Record<string, McpServerConfig> } | null;
    addServers(projectMcpConfig?.mcpServers, 'claude', 'project');
    // Also try plugin format (no mcpServers wrapper)
    addServersFromPluginConfig(projectMcpPath, 'claude', 'project');
  }

  // Priority 2: User-scope Claude Code (~/.mcp.json)
  const userMcpPath = path.join(os.homedir(), '.mcp.json');
  const userMcpConfig = readJsonConfig(userMcpPath) as { mcpServers?: Record<string, McpServerConfig> } | null;
  addServers(userMcpConfig?.mcpServers, 'claude', 'user');

  // Priority 3: Legacy Claude Code (~/.claude.json)
  const legacyClaudePath = path.join(os.homedir(), '.claude.json');
  const legacyConfig = readJsonConfig(legacyClaudePath) as {
    mcpServers?: Record<string, McpServerConfig>;
    projects?: Record<string, { mcpServers?: Record<string, McpServerConfig> }>;
  } | null;

  if (legacyConfig) {
    // Project-specific in legacy config
    if (projectPath && legacyConfig.projects?.[projectPath]?.mcpServers) {
      addServers(legacyConfig.projects[projectPath].mcpServers, 'claude', 'local');
    }
    // User-level in legacy config
    addServers(legacyConfig.mcpServers, 'claude', 'user');
  }

  // Priority 4: VSCode Copilot (.vscode/mcp.json)
  if (projectPath) {
    const vscodeMcpPath = path.join(projectPath, '.vscode', 'mcp.json');
    const vscodeConfig = readJsonConfig(vscodeMcpPath) as { servers?: Record<string, McpServerConfig> } | null;
    addServers(vscodeConfig?.servers, 'copilot', 'project');
  }

  // Priority 5: Copilot CLI (~/.copilot/mcp-config.json)
  const copilotConfigPath = path.join(os.homedir(), '.copilot', 'mcp-config.json');
  const copilotConfig = readJsonConfig(copilotConfigPath) as { mcpServers?: Record<string, McpServerConfig> } | null;
  addServers(copilotConfig?.mcpServers, 'copilot', 'user');

  // Priority 6: Cursor (~/.cursor/mcp.json)
  const cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  const cursorConfig = readJsonConfig(cursorConfigPath) as { mcpServers?: Record<string, McpServerConfig> } | null;
  addServers(cursorConfig?.mcpServers, 'copilot', 'user');

  // Priority 7: Factory (~/.factory/mcp.json)
  const factoryConfigPath = path.join(os.homedir(), '.factory', 'mcp.json');
  const factoryConfig = readJsonConfig(factoryConfigPath) as { mcpServers?: Record<string, McpServerConfig> } | null;
  addServers(factoryConfig?.mcpServers, 'copilot', 'user');

  // Priority 8: Codex CLI (~/.codex/config.toml) - simplified, skip TOML parsing for now
  // TODO: Add TOML parsing if needed

  appLog.info(`[MCP] Found ${servers.length} MCP servers`);
  return servers;
}

/**
 * Get tools from an MCP server using MCP protocol
 */
async function getToolsFromServer(server: McpServer): Promise<McpToolReference[]> {
  if (server.type === 'http' && server.url) {
    return getToolsFromHttpServer(server);
  } else if (server.type === 'command' && server.command) {
    return getToolsFromCommandServer(server);
  }
  return [];
}

/**
 * Get tools from HTTP MCP server
 */
async function getToolsFromHttpServer(server: McpServer): Promise<McpToolReference[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(server.url!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('text/event-stream')) {
      const text = await response.text();
      const dataLine = text.split('\n').find(line => line.startsWith('data:'));
      if (dataLine) {
        data = JSON.parse(dataLine.substring(5).trim());
      }
    } else {
      data = await response.json();
    }

    if (data?.result?.tools) {
      return data.result.tools.map((tool: { name: string; description?: string }) => ({
        name: tool.name,
        description: tool.description || '',
        serverId: server.id,
      }));
    }

    return [];
  } catch (error) {
    appLog.warn(`[MCP] Failed to get tools from HTTP server ${server.id}:`, error);
    return [];
  }
}

/**
 * Get tools from command-based MCP server
 */
async function getToolsFromCommandServer(server: McpServer): Promise<McpToolReference[]> {
  if (!server.command) {
    return [];
  }

  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const isWindows = process.platform === 'win32';
    const args = server.args || [];

    appLog.info(`[MCP] Starting command server ${server.id}: ${server.command} ${args.join(' ')}`);

    const proc = spawn(server.command!, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
      shell: isWindows,
    });

    let stdout = '';
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        appLog.warn(`[MCP] Timeout getting tools from ${server.id}`);
        resolve([]);
      }
    }, 15000);

    // Send MCP initialize request first
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'auto-claude-workflow',
          version: '1.0.0',
        },
      },
    }) + '\n';

    proc.stdin.write(initRequest);

    // Track initialization state
    let initialized = false;

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();

      try {
        const lines = stdout.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);

            // Handle initialize response
            if (response.id === 1 && response.result && !initialized) {
              initialized = true;
              appLog.info(`[MCP] Server ${server.id} initialized, requesting tools list`);

              // Now request tools list
              const toolsRequest = JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
                params: {},
              }) + '\n';

              proc.stdin.write(toolsRequest);
            }

            // Handle tools/list response
            if (response.id === 2 && response.result?.tools) {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                proc.kill();

                const tools = response.result.tools.map((tool: { name: string; description?: string }) => ({
                  name: tool.name,
                  description: tool.description || '',
                  serverId: server.id,
                }));

                appLog.info(`[MCP] Got ${tools.length} tools from ${server.id}`);
                resolve(tools);
              }
              return;
            }
          } catch {
            // Not valid JSON, continue
          }
        }
      } catch {
        // Parse error, keep waiting
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      appLog.warn(`[MCP] Server ${server.id} stderr: ${data.toString()}`);
    });

    proc.on('error', (error: Error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        appLog.error(`[MCP] Failed to start server ${server.id}:`, error);
        resolve([]);
      }
    });

    proc.on('close', (code: number) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        appLog.info(`[MCP] Server ${server.id} closed with code ${code}`);
        resolve([]);
      }
    });
  });
}

/**
 * Get tool schema from an MCP server
 */
async function getToolSchemaFromServer(
  server: McpServer,
  toolName: string
): Promise<McpToolSchema | null> {
  // For HTTP servers, we can try to get the schema
  if (server.type === 'http' && server.url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      // First get the tools list to find the schema
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('text/event-stream')) {
        const text = await response.text();
        const dataLine = text.split('\n').find(line => line.startsWith('data:'));
        if (dataLine) {
          data = JSON.parse(dataLine.substring(5).trim());
        }
      } else {
        data = await response.json();
      }

      if (data?.result?.tools) {
        const tool = data.result.tools.find((t: { name: string }) => t.name === toolName);
        if (tool) {
          return {
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema,
            parameters: convertInputSchemaToParameters(tool.inputSchema),
          };
        }
      }

      return null;
    } catch (error) {
      appLog.warn(`[MCP] Failed to get tool schema from ${server.id}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Convert JSON Schema to ToolParameter array
 */
function convertInputSchemaToParameters(inputSchema?: {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
}): ToolParameter[] {
  if (!inputSchema?.properties) {
    return [];
  }

  const required = inputSchema.required || [];

  return Object.entries(inputSchema.properties).map(([name, schema]) => {
    const paramSchema = schema as {
      type?: string;
      description?: string;
    };

    let paramType: ToolParameter['type'] = 'string';
    const schemaType = paramSchema.type || 'string';

    if (['string', 'number', 'boolean', 'integer', 'array', 'object'].includes(schemaType)) {
      paramType = schemaType as ToolParameter['type'];
    }

    return {
      name,
      type: paramType,
      description: paramSchema.description || '',
      required: required.includes(name),
    };
  });
}

/**
 * Translate tool descriptions to Chinese using AI
 */
async function translateToolDescriptions(tools: McpToolReference[]): Promise<McpToolReference[]> {
  if (tools.length === 0) return tools;

  // Build text to translate
  const descriptions = tools.map(t => t.description || '').filter(d => d.length > 0);
  if (descriptions.length === 0) {
    return tools.map(tool => ({
      ...tool,
      description: tool.description || '暂无描述'
    }));
  }

  try {
    const pythonPath = await getConfiguredPythonPath();
    // Get Auto-Claude project path
    const autoClaudePath = path.resolve(__dirname, '..', '..', '..', '..');

    const result = await new Promise<{ translations: string[] }>((resolve, reject) => {
      const pythonProcess = spawn(pythonPath, [
        '-c',
        `
import sys
import asyncio
import json
from pathlib import Path

sys.path.insert(0, '${path.join(autoClaudePath, 'apps', 'backend').replace(/\\/g, '/')}')

from workflow.ai_translator import translate_to_chinese

async def main():
    try:
        input_data = json.loads(sys.stdin.read())
        descriptions = input_data['descriptions']

        translations = await translate_to_chinese(
            texts=descriptions,
            project_dir=Path('${autoClaudePath.replace(/\\/g, '/')}'),
            spec_dir=Path('${autoClaudePath.replace(/\\/g, '/')}').joinpath('.auto-claude', 'spec'),
        )

        print(json.dumps({"translations": translations}))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

asyncio.run(main())
`
      ], {
        cwd: autoClaudePath,
        env: {
          ...process.env,
          PYTHONPATH: path.join(autoClaudePath, 'apps', 'backend')
        }
      });

      let outputBuffer = '';
      let errorBuffer = '';

      pythonProcess.stdout?.on('data', (data) => {
        outputBuffer += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        errorBuffer += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0 && outputBuffer) {
          try {
            resolve(JSON.parse(outputBuffer.trim()));
          } catch {
            reject(new Error('Failed to parse translation result'));
          }
        } else {
          reject(new Error(errorBuffer || 'Translation failed'));
        }
      });

      pythonProcess.stdin?.write(JSON.stringify({ descriptions }));
      pythonProcess.stdin?.end();

      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Translation timeout'));
      }, 60000);
    });

    // Map translations back to tools
    let translationIndex = 0;
    return tools.map(tool => {
      if (tool.description && tool.description.length > 0) {
        const translation = result.translations[translationIndex] || tool.description;
        translationIndex++;
        return { ...tool, description: translation };
      }
      return { ...tool, description: '暂无描述' };
    });
  } catch (error) {
    appLog.warn('[MCP] Translation failed, using original descriptions:', error);
    return tools.map(tool => ({
      ...tool,
      description: tool.description || '暂无描述'
    }));
  }
}

// ============================================================================
// IPC Handlers
// ============================================================================

/**
 * Register MCP workflow studio IPC handlers
 */
export function registerMcpWorkflowHandlers(): void {
  appLog.info('[MCP Workflow] Registering MCP workflow studio handlers');

  // List all MCP servers
  ipcMain.handle(IPC_CHANNELS.MCP_LIST_SERVERS, async (_event, payload?: { filterByScope?: string[] }) => {
    try {
      const now = Date.now();

      // Use cache if valid
      if (mcpCache.servers && now - mcpCache.lastRefresh < CACHE_TTL) {
        let servers = mcpCache.servers;

        // Apply scope filter if provided
        if (payload?.filterByScope?.length) {
          servers = servers.filter(s => payload.filterByScope!.includes(s.scope));
        }

        return { success: true, data: { servers } };
      }

      // Refresh cache
      // TODO: Get project path from active project
      const servers = getAllMcpServers();
      mcpCache.servers = servers;
      mcpCache.lastRefresh = now;

      let filteredServers = servers;
      if (payload?.filterByScope?.length) {
        filteredServers = servers.filter(s => payload.filterByScope!.includes(s.scope));
      }

      return { success: true, data: { servers: filteredServers } };
    } catch (error) {
      appLog.error('[MCP Workflow] Failed to list servers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list MCP servers',
      };
    }
  });

  // Get tools from a specific server
  ipcMain.handle(IPC_CHANNELS.MCP_GET_TOOLS, async (_event, payload: { serverId: string }) => {
    try {
      const { serverId } = payload;

      // Check translated cache first
      if (mcpCache.translatedTools.has(serverId)) {
        return { success: true, data: { tools: mcpCache.translatedTools.get(serverId) } };
      }

      // Find server
      if (!mcpCache.servers) {
        mcpCache.servers = getAllMcpServers();
        mcpCache.lastRefresh = Date.now();
      }

      const server = mcpCache.servers.find(s => s.id === serverId);
      if (!server) {
        return { success: false, error: `Server not found: ${serverId}` };
      }

      // Get tools
      const tools = await getToolsFromServer(server);
      mcpCache.tools.set(serverId, tools);

      // Translate descriptions to Chinese
      const translatedTools = await translateToolDescriptions(tools);
      mcpCache.translatedTools.set(serverId, translatedTools);

      return { success: true, data: { tools: translatedTools } };
    } catch (error) {
      appLog.error('[MCP Workflow] Failed to get tools:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get MCP tools',
      };
    }
  });

  // Get tool schema
  ipcMain.handle(IPC_CHANNELS.MCP_GET_TOOL_SCHEMA, async (_event, payload: { serverId: string; toolName: string }) => {
    try {
      const { serverId, toolName } = payload;
      const cacheKey = `${serverId}:${toolName}`;

      // Check cache
      if (mcpCache.schemas.has(cacheKey)) {
        return { success: true, data: { schema: mcpCache.schemas.get(cacheKey) } };
      }

      // Find server
      if (!mcpCache.servers) {
        mcpCache.servers = getAllMcpServers();
        mcpCache.lastRefresh = Date.now();
      }

      const server = mcpCache.servers.find(s => s.id === serverId);
      if (!server) {
        return { success: false, error: `Server not found: ${serverId}` };
      }

      // Get schema
      const schema = await getToolSchemaFromServer(server, toolName);
      if (schema) {
        mcpCache.schemas.set(cacheKey, schema);
      }

      return { success: true, data: { schema } };
    } catch (error) {
      appLog.error('[MCP Workflow] Failed to get tool schema:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get MCP tool schema',
      };
    }
  });

  // Refresh cache
  ipcMain.handle(IPC_CHANNELS.MCP_REFRESH_CACHE, async () => {
    try {
      mcpCache.servers = null;
      mcpCache.tools.clear();
      mcpCache.schemas.clear();
      mcpCache.translatedTools.clear();
      mcpCache.lastRefresh = 0;

      appLog.info('[MCP Workflow] Cache cleared');
      return { success: true };
    } catch (error) {
      appLog.error('[MCP Workflow] Failed to refresh cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh MCP cache',
      };
    }
  });

  appLog.info('[MCP Workflow] MCP workflow studio handlers registered');
}
