/**
 * MCP Server API
 *
 * Exposes MCP health check, connection test, and workflow studio functionality to the renderer.
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';
import type { IPCResult } from '../../../shared/types/common';
import type { CustomMcpServer, McpHealthCheckResult, McpTestConnectionResult } from '../../../shared/types/project';

// Workflow Studio MCP types
interface ListMcpServersPayload {
  filterByScope?: ('user' | 'project' | 'local')[];
}

interface McpServersResult {
  servers: Array<{
    id: string;
    name: string;
    type: 'http' | 'command';
    url?: string;
    command?: string;
    args?: string[];
    scope: 'user' | 'project' | 'local';
    status?: 'healthy' | 'unhealthy' | 'unknown';
  }>;
}

interface GetMcpToolsPayload {
  serverId: string;
}

interface McpToolsResult {
  tools: Array<{
    name: string;
    description?: string;
    serverId: string;
  }>;
}

interface GetMcpToolSchemaPayload {
  serverId: string;
  toolName: string;
}

interface McpToolSchemaResult {
  schema?: {
    name: string;
    description?: string;
    parameters?: unknown[];
    inputSchema?: {
      type: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface McpAPI {
  /** Quick health check for a custom MCP server */
  checkMcpHealth: (server: CustomMcpServer) => Promise<IPCResult<McpHealthCheckResult>>;
  /** Full MCP connection test */
  testMcpConnection: (server: CustomMcpServer) => Promise<IPCResult<McpTestConnectionResult>>;
  /** List all configured MCP servers (for workflow studio) */
  listServers: (payload?: ListMcpServersPayload) => Promise<IPCResult<McpServersResult>>;
  /** Get tools from a specific MCP server (for workflow studio) */
  getTools: (payload: GetMcpToolsPayload) => Promise<IPCResult<McpToolsResult>>;
  /** Get detailed schema for a specific MCP tool (for workflow studio) */
  getToolSchema: (payload: GetMcpToolSchemaPayload) => Promise<IPCResult<McpToolSchemaResult>>;
  /** Refresh MCP cache (for workflow studio) */
  refreshCache: () => Promise<IPCResult<void>>;
  /** Translate tool descriptions to Chinese using AI */
  translateDescriptions: (descriptions: { name: string; description: string }[]) => Promise<IPCResult<{ name: string; description: string }[]>>;
  /** Clear translation cache */
  clearTranslationCache: () => Promise<IPCResult<void>>;
}

export function createMcpAPI(): McpAPI {
  return {
    checkMcpHealth: (server: CustomMcpServer) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_CHECK_HEALTH, server),

    testMcpConnection: (server: CustomMcpServer) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_TEST_CONNECTION, server),

    listServers: (payload?: ListMcpServersPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_LIST_SERVERS, payload),

    getTools: (payload: GetMcpToolsPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_GET_TOOLS, payload),

    getToolSchema: (payload: GetMcpToolSchemaPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_GET_TOOL_SCHEMA, payload),

    refreshCache: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_REFRESH_CACHE),

    translateDescriptions: (descriptions: { name: string; description: string }[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_TRANSLATE_DESCRIPTIONS, descriptions),

    clearTranslationCache: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_CLEAR_TRANSLATION_CACHE),
  };
}
