/**
 * MCP Service - Renderer to Main Process Communication
 *
 * Adapted from cc-wf-studio for Auto-Claude Electron environment.
 * Provides MCP operations for the workflow editor.
 *
 * Original: cc-wf-studio/src/webview/src/services/mcp-service.ts
 * Uses Electron IPC instead of VSCode postMessage.
 */

import type { ToolParameter } from '@shared/types/workflow';

// ============================================================================
// Types
// ============================================================================

export interface McpServer {
  id: string;
  name: string;
  type: 'http' | 'command';
  url?: string;
  command?: string;
  args?: string[];
  scope: 'user' | 'project' | 'local';
  source?: 'claude' | 'copilot' | 'codex';
  status?: 'healthy' | 'unhealthy' | 'unknown';
}

export interface McpToolReference {
  name: string;
  description?: string;
  serverId: string;
}

export interface McpToolSchema {
  name: string;
  description?: string;
  parameters?: unknown[];
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface ListMcpServersPayload {
  filterByScope?: ('user' | 'project' | 'local')[];
}

export interface McpServersResultPayload {
  success: boolean;
  servers: McpServer[];
  error?: string;
}

export interface GetMcpToolsPayload {
  serverId: string;
}

export interface McpToolsResultPayload {
  success: boolean;
  tools: McpToolReference[];
  error?: string;
}

export interface GetMcpToolSchemaPayload {
  serverId: string;
  toolName: string;
}

export interface McpToolSchemaResultPayload {
  success: boolean;
  schema?: McpToolSchema;
  error?: string;
}

export interface McpCacheRefreshedPayload {
  success: boolean;
  message?: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * List all configured MCP servers
 *
 * @param payload - Server list request options (optional scope filter)
 * @returns Promise resolving to server list result
 *
 * @example
 * ```typescript
 * const result = await listMcpServers({ filterByScope: ['user', 'project'] });
 * if (result.success) {
 *   console.log(`Found ${result.servers.length} MCP servers`);
 * }
 * ```
 */
export async function listMcpServers(
  payload?: ListMcpServersPayload
): Promise<McpServersResultPayload> {
  try {
    const result = await window.electronAPI.mcp.listServers(payload);
    if (result.success && result.data) {
      return {
        success: true,
        servers: result.data.servers || [],
      };
    }
    return {
      success: false,
      servers: [],
      error: result.error || 'Failed to list MCP servers',
    };
  } catch (error) {
    return {
      success: false,
      servers: [],
      error: error instanceof Error ? error.message : 'Failed to list MCP servers',
    };
  }
}

/**
 * Get tools from a specific MCP server
 *
 * @param payload - Tool list request with server ID
 * @returns Promise resolving to tool list result
 *
 * @example
 * ```typescript
 * const result = await getMcpTools({ serverId: 'aws-knowledge-mcp' });
 * if (result.success) {
 *   console.log(`Found ${result.tools.length} tools`);
 * }
 * ```
 */
export async function getMcpTools(payload: GetMcpToolsPayload): Promise<McpToolsResultPayload> {
  try {
    const result = await window.electronAPI.mcp.getTools(payload);
    if (result.success && result.data) {
      return {
        success: true,
        tools: result.data.tools || [],
      };
    }
    return {
      success: false,
      tools: [],
      error: result.error || 'Failed to get MCP tools',
    };
  } catch (error) {
    return {
      success: false,
      tools: [],
      error: error instanceof Error ? error.message : 'Failed to get MCP tools',
    };
  }
}

/**
 * Get detailed schema for a specific MCP tool
 *
 * @param payload - Tool schema request with server ID and tool name
 * @returns Promise resolving to tool schema result
 *
 * @example
 * ```typescript
 * const result = await getMcpToolSchema({ serverId: 'aws-knowledge-mcp', toolName: 'get_regional_availability' });
 * if (result.success && result.schema) {
 *   console.log(`Tool has ${result.schema.parameters?.length || 0} parameters`);
 * }
 * ```
 */
export async function getMcpToolSchema(
  payload: GetMcpToolSchemaPayload
): Promise<McpToolSchemaResultPayload> {
  try {
    const result = await window.electronAPI.mcp.getToolSchema(payload);
    if (result.success && result.data) {
      return {
        success: true,
        schema: result.data.schema,
      };
    }
    return {
      success: false,
      error: result.error || 'Failed to get MCP tool schema',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get MCP tool schema',
    };
  }
}

/**
 * Search and filter tools by query
 *
 * Client-side filtering of tool list by name/description keywords.
 *
 * @param tools - Array of tools to filter
 * @param query - Search query string
 * @returns Filtered tool list
 *
 * @example
 * ```typescript
 * const filtered = filterTools(allTools, 'region');
 * // Returns tools with "region" in name or description
 * ```
 */
export function filterTools(tools: McpToolReference[], query: string): McpToolReference[] {
  if (!query.trim()) {
    return tools;
  }

  const lowerQuery = query.toLowerCase();

  return tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Refresh MCP cache
 *
 * Invalidates all cached MCP data. Useful when MCP servers are added/removed.
 *
 * @returns Promise resolving to cache refresh result
 *
 * @example
 * ```typescript
 * const result = await refreshMcpCache();
 * if (result.success) {
 *   console.log('MCP cache refreshed successfully');
 * }
 * ```
 */
export async function refreshMcpCache(): Promise<McpCacheRefreshedPayload> {
  try {
    const result = await window.electronAPI.mcp.refreshCache();
    if (result.success) {
      return {
        success: true,
        message: 'MCP cache refreshed successfully',
      };
    }
    return {
      success: false,
      message: result.error || 'Failed to refresh MCP cache',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to refresh MCP cache',
    };
  }
}

/**
 * Translate tool descriptions to Chinese using AI
 *
 * @param descriptions - Array of tool names and descriptions to translate
 * @returns Promise resolving to translated descriptions
 *
 * @example
 * ```typescript
 * const result = await translateToolDescriptions([
 *   { name: 'read_file', description: 'Reads a file from the filesystem' }
 * ]);
 * // Returns [{ name: 'read_file', description: '从文件系统读取文件' }]
 * ```
 */
export async function translateToolDescriptions(
  descriptions: { name: string; description: string }[]
): Promise<{ success: boolean; data?: { name: string; description: string }[]; error?: string }> {
  try {
    const result = await window.electronAPI.mcp.translateDescriptions(descriptions);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data,
      };
    }
    return {
      success: false,
      error: result.error || 'Failed to translate descriptions',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to translate descriptions',
    };
  }
}

/**
 * Clear the translation cache
 *
 * @returns Promise resolving to clear result
 */
export async function clearTranslationCache(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await window.electronAPI.mcp.clearTranslationCache();
    return { success: result.success };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear translation cache',
    };
  }
}
