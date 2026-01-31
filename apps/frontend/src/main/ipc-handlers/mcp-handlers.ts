/**
 * MCP Server Health Check Handlers
 *
 * Handles IPC requests for checking MCP server health and connectivity.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc';
import type { CustomMcpServer, McpHealthCheckResult, McpHealthStatus, McpTestConnectionResult } from '../../shared/types/project';
import { spawn } from 'child_process';
import { createLogger } from '../lib/logger';

const logger = createLogger('MCP');
import { isWindows } from '../platform';
// Import custom MetaMCP handler (won't be overwritten by upstream merges)
import { isMetaMcpServer, testMetaMcpConnection, checkMetaMcpHealth, isUnityMcpServer, checkUnityMcpHealth } from '../custom/metamcp-handler';
// Import tool description translator
import { toolDescriptionTranslator } from '../tool-description-translator';

/**
 * Defense-in-depth: Frontend-side command validation
 * Mirrors the backend SAFE_COMMANDS allowlist to prevent arbitrary command execution
 * even if malicious configs somehow bypass backend validation
 */
const SAFE_COMMANDS = new Set(['npx', 'npm', 'node', 'python', 'python3', 'uv', 'uvx']);

/**
 * Defense-in-depth: Dangerous interpreter flags that allow code execution
 * Mirrors backend DANGEROUS_FLAGS to prevent args-based code injection
 */
const DANGEROUS_FLAGS = new Set([
  '--eval', '-e', '-c', '--exec',
  '-m', '-p', '--print',
  '--input-type=module', '--experimental-loader',
  '--require', '-r'
]);

/**
 * Defense-in-depth: Shell metacharacters that could enable command injection
 * when shell: true is used on Windows
 */
const SHELL_METACHARACTERS = ['&', '|', '>', '<', '^', '%', ';', '$', '`', '\n', '\r'];

/**
 * Validate that a command is in the safe allowlist
 */
function isCommandSafe(command: string | undefined): boolean {
  if (!command) return false;
  // Reject commands with paths (defense against path traversal)
  if (command.includes('/') || command.includes('\\')) return false;
  return SAFE_COMMANDS.has(command);
}

/**
 * Validate that args don't contain dangerous interpreter flags or shell metacharacters
 */
function areArgsSafe(args: string[] | undefined): boolean {
  if (!args || args.length === 0) return true;

  // Check for dangerous interpreter flags
  if (args.some(arg => DANGEROUS_FLAGS.has(arg))) return false;

  // On Windows with shell: true, check for shell metacharacters that could enable injection
  if (isWindows()) {
    if (args.some(arg => SHELL_METACHARACTERS.some(char => arg.includes(char)))) {
      return false;
    }
  }

  return true;
}

/**
 * Quick health check for a custom MCP server.
 * For HTTP servers: makes a HEAD/GET request to check connectivity.
 * For command servers: checks if the command exists.
 */
async function checkMcpHealth(server: CustomMcpServer): Promise<McpHealthCheckResult> {
  const startTime = Date.now();

  if (server.type === 'http') {
    // Check if this is a MetaMCP server and use custom handler
    if (isMetaMcpServer(server)) {
      logger.info('[MCP] Detected MetaMCP server for health check, using custom handler');
      return checkMetaMcpHealth(server);
    }
    // Check if this is a Unity MCP server and use custom handler
    if (isUnityMcpServer(server)) {
      logger.info('[MCP] Detected Unity MCP server for health check, using custom handler');
      return checkUnityMcpHealth(server);
    }
    return checkHttpHealth(server, startTime);
  } else {
    return checkCommandHealth(server, startTime);
  }
}

/**
 * Check HTTP server health by making a request.
 */
async function checkHttpHealth(server: CustomMcpServer, startTime: number): Promise<McpHealthCheckResult> {
  if (!server.url) {
    return {
      serverId: server.id,
      status: 'unhealthy',
      message: 'No URL configured',
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/event-stream',
    };

    // Add custom headers if configured
    if (server.headers) {
      Object.assign(headers, server.headers);
    }

    const response = await fetch(server.url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    let status: McpHealthStatus;
    let message: string;

    if (response.ok) {
      status = 'healthy';
      message = 'Server is responding';
    } else if (response.status === 401 || response.status === 403) {
      status = 'needs_auth';
      message = response.status === 401 ? 'Authentication required' : 'Access forbidden';
    } else {
      status = 'unhealthy';
      message = `HTTP ${response.status}: ${response.statusText}`;
    }

    return {
      serverId: server.id,
      status,
      statusCode: response.status,
      message,
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    const status: McpHealthStatus = 'unhealthy';
    let message = errorMessage;

    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      message = 'Connection timed out';
    } else if (errorMessage.includes('ECONNREFUSED')) {
      message = 'Connection refused - server may be down';
    } else if (errorMessage.includes('ENOTFOUND')) {
      message = 'Server not found - check URL';
    }

    return {
      serverId: server.id,
      status,
      message,
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Check command-based server health by verifying the command exists.
 */
async function checkCommandHealth(server: CustomMcpServer, startTime: number): Promise<McpHealthCheckResult> {
  if (!server.command) {
    return {
      serverId: server.id,
      status: 'unhealthy',
      message: 'No command configured',
      checkedAt: new Date().toISOString(),
    };
  }

  return new Promise((resolve) => {
    // Defense-in-depth: Validate command and args before spawn
    if (!isCommandSafe(server.command)) {
      return resolve({
        serverId: server.id,
        status: 'unhealthy',
        message: `Invalid command '${server.command}' - not in allowlist`,
        checkedAt: new Date().toISOString(),
      });
    }
    if (!areArgsSafe(server.args)) {
      return resolve({
        serverId: server.id,
        status: 'unhealthy',
        message: 'Args contain dangerous flags or shell metacharacters',
        checkedAt: new Date().toISOString(),
      });
    }

    const command = isWindows() ? 'where' : 'which';
    const proc = spawn(command, [server.command!], {
      timeout: 5000,
    });

    let found = false;

    proc.on('close', (code) => {
      const responseTime = Date.now() - startTime;

      if (code === 0 || found) {
        resolve({
          serverId: server.id,
          status: 'healthy',
          message: `Command '${server.command}' found`,
          responseTime,
          checkedAt: new Date().toISOString(),
        });
      } else {
        resolve({
          serverId: server.id,
          status: 'unhealthy',
          message: `Command '${server.command}' not found in PATH`,
          responseTime,
          checkedAt: new Date().toISOString(),
        });
      }
    });

    proc.stdout.on('data', () => {
      found = true;
    });

    proc.on('error', () => {
      const responseTime = Date.now() - startTime;
      resolve({
        serverId: server.id,
        status: 'unhealthy',
        message: `Failed to check command '${server.command}'`,
        responseTime,
        checkedAt: new Date().toISOString(),
      });
    });
  });
}

/**
 * Full MCP connection test - actually connects to the server and tries to list tools.
 * This is more thorough but slower than the health check.
 */
async function testMcpConnection(server: CustomMcpServer): Promise<McpTestConnectionResult> {
  const startTime = Date.now();
  logger.info(`[MCP] testMcpConnection called for server: ${server.id}, name: ${server.name}, type: ${server.type}, url: ${server.url || 'none'}, command: ${server.command || 'none'}`);

  if (server.type === 'http') {
    // Check if this is a MetaMCP server and use custom handler
    if (isMetaMcpServer(server)) {
      logger.info('[MCP] Detected MetaMCP server, using custom handler');
      return testMetaMcpConnection(server);
    }
    logger.info(`[MCP] Using HTTP connection test for ${server.id}`);
    const result = await testHttpConnection(server, startTime);
    logger.info(`[MCP] HTTP test result for ${server.id}: success=${result.success}, message=${result.message}, error=${result.error || 'none'}`);
    return result;
  } else {
    logger.info(`[MCP] Using command connection test for ${server.id}`);
    const result = await testCommandConnection(server, startTime);
    logger.info(`[MCP] Command test result for ${server.id}: success=${result.success}, message=${result.message}, error=${result.error || 'none'}`);
    return result;
  }
}

/**
 * Test HTTP MCP server connection with a specific URL.
 * Handles both JSON and SSE (text/event-stream) response formats.
 * Supports session ID for servers like Unity MCP that require it.
 */
async function testHttpConnectionWithUrl(
  serverId: string,
  url: string,
  startTime: number,
  headers?: Record<string, string>
): Promise<McpTestConnectionResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...headers,
    };

    // Send MCP initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'auto-claude-health-check',
          version: '1.0.0',
        },
      },
    };

    logger.info(`[MCP] testHttpConnectionWithUrl: sending initialize to ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(initRequest),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    // Get session ID from response headers (required by Unity MCP)
    const sessionId = response.headers.get('mcp-session-id');
    logger.info(`[MCP] testHttpConnectionWithUrl: status=${response.status}, sessionId=${sessionId}`);

    // For SSE responses, 200 OK is success even if body parsing fails
    if (!response.ok) {
      // Special case: 400 might mean server needs session - try to read error
      const errorText = await response.text().catch(() => '');
      return {
        serverId,
        success: false,
        message: `HTTP ${response.status}`,
        error: errorText || undefined,
        responseTime,
      };
    }

    // Try to parse response - handle both JSON and SSE formats
    const contentType = response.headers.get('content-type') || '';
    let data;
    
    try {
      const text = await response.text();
      
      if (contentType.includes('text/event-stream') || text.includes('event:')) {
        // SSE format: look for "data:" lines
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.substring(5).trim();
            if (jsonStr) {
              data = JSON.parse(jsonStr);
              break;
            }
          }
        }
      } else {
        // Regular JSON response
        data = JSON.parse(text);
      }
    } catch (parseError) {
      // If we got 200 OK but can't parse, still consider it a success
      // (server is reachable)
      return {
        serverId,
        success: true,
        message: 'Server reachable (response parse warning)',
        responseTime,
      };
    }

    if (data?.error) {
      return {
        serverId,
        success: false,
        message: 'MCP error',
        error: data.error.message || JSON.stringify(data.error),
        responseTime,
      };
    }

    if (data?.result || data?.id) {
      // Now try to list tools using session ID if available
      let tools: string[] = [];

      if (sessionId) {
        try {
          const toolsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
          };

          const toolsHeaders = {
            ...requestHeaders,
            'mcp-session-id': sessionId,
          };

          const toolsResponse = await fetch(url, {
            method: 'POST',
            headers: toolsHeaders,
            body: JSON.stringify(toolsRequest),
          });

          if (toolsResponse.ok) {
            const toolsContentType = toolsResponse.headers.get('content-type') || '';
            let toolsData;
            const toolsText = await toolsResponse.text();

            if (toolsContentType.includes('text/event-stream') || toolsText.includes('event:')) {
              const dataLine = toolsText.split('\n').find(line => line.startsWith('data:'));
              if (dataLine) {
                const jsonStr = dataLine.substring(5).trim();
                toolsData = JSON.parse(jsonStr);
              }
            } else {
              toolsData = JSON.parse(toolsText);
            }

            if (toolsData?.result?.tools) {
              tools = toolsData.result.tools.map((t: { name: string }) => t.name);
            }
          }
        } catch (toolsError) {
          logger.info(`[MCP] testHttpConnectionWithUrl: failed to get tools: ${toolsError}`);
        }
      }

      // Extract server info if available
      const serverInfo = data?.result?.serverInfo;
      const message = tools.length > 0
        ? `Connected to ${serverInfo?.name || 'MCP server'}, ${tools.length} tools available`
        : serverInfo?.name
          ? `Connected to ${serverInfo.name} v${serverInfo.version || '?'}`
          : 'Connected successfully';
      return {
        serverId,
        success: true,
        message,
        tools,
        responseTime,
      };
    }

    return {
      serverId,
      success: false,
      message: 'Invalid MCP response',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Connection failed';
    
    // Provide more helpful error messages
    let message = 'Connection failed';
    if (errorMessage.includes('ECONNREFUSED')) {
      message = 'Server not running';
    } else if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      message = 'Connection timed out';
    }
    
    return {
      serverId,
      success: false,
      message,
      error: errorMessage,
      responseTime,
    };
  }
}

/**
 * Test HTTP MCP server connection by sending an MCP initialize request.
 */
async function testHttpConnection(server: CustomMcpServer, startTime: number): Promise<McpTestConnectionResult> {
  logger.info(`[MCP] testHttpConnection called for ${server.id}, url: ${server.url}`);

  if (!server.url) {
    return {
      serverId: server.id,
      success: false,
      message: 'No URL configured',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (server.headers) {
      Object.assign(headers, server.headers);
    }

    // Send MCP initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'auto-claude-health-check',
          version: '1.0.0',
        },
      },
    };

    const response = await fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(initRequest),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    logger.info(`[MCP] Initialize response: status=${response.status}, contentType=${response.headers.get('content-type')}, sessionId=${response.headers.get('mcp-session-id')}`);

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          serverId: server.id,
          success: false,
          message: 'Authentication failed',
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime,
        };
      }
      return {
        serverId: server.id,
        success: false,
        message: `Server returned error`,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
      };
    }

    // Parse response - handle both JSON and SSE (text/event-stream) formats
    let data;
    if (contentType.includes('text/event-stream')) {
      // SSE format: extract data from lines like "data: {...}"
      const text = await response.text();
      const dataLine = text.split('\n').find(line => line.startsWith('data:'));
      if (dataLine) {
        const jsonStr = dataLine.substring(5).trim(); // Remove "data:" prefix
        try {
          data = JSON.parse(jsonStr);
        } catch {
          return {
            serverId: server.id,
            success: false,
            message: 'Failed to parse SSE response',
            responseTime,
          };
        }
      } else {
        return {
          serverId: server.id,
          success: false,
          message: 'No data in SSE response',
          responseTime,
        };
      }
    } else {
      // Regular JSON response
      data = await response.json();
    }

    if (data.error) {
      return {
        serverId: server.id,
        success: false,
        message: 'MCP error',
        error: data.error.message || JSON.stringify(data.error),
        responseTime,
      };
    }

    // Get session ID from response headers (required by some MCP servers like Unity MCP)
    const sessionId = response.headers.get('mcp-session-id');

    // Now try to list tools
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    // Add session ID to headers if available
    const toolsHeaders = { ...headers };
    if (sessionId) {
      toolsHeaders['mcp-session-id'] = sessionId;
    }

    const toolsResponse = await fetch(server.url, {
      method: 'POST',
      headers: toolsHeaders,
      body: JSON.stringify(toolsRequest),
    });

    let tools: string[] = [];
    if (toolsResponse.ok) {
      const toolsContentType = toolsResponse.headers.get('content-type') || '';
      let toolsData;
      if (toolsContentType.includes('text/event-stream')) {
        // Parse SSE format
        const text = await toolsResponse.text();
        const dataLine = text.split('\n').find(line => line.startsWith('data:'));
        if (dataLine) {
          const jsonStr = dataLine.substring(5).trim();
          try {
            toolsData = JSON.parse(jsonStr);
          } catch {
            // Failed to parse, skip
          }
        }
      } else {
        toolsData = await toolsResponse.json();
      }
      if (toolsData?.result?.tools) {
        tools = toolsData.result.tools.map((t: { name: string }) => t.name);
      }
    }

    return {
      serverId: server.id,
      success: true,
      message: tools.length > 0 ? `Connected successfully, ${tools.length} tools available` : 'Connected successfully',
      tools,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    let message = 'Connection failed';
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      message = 'Connection timed out';
    } else if (errorMessage.includes('ECONNREFUSED')) {
      message = 'Connection refused - server may be down';
    } else if (errorMessage.includes('ENOTFOUND')) {
      message = 'Server not found - check URL';
    }

    return {
      serverId: server.id,
      success: false,
      message,
      error: errorMessage,
      responseTime,
    };
  }
}

/**
 * Test command-based MCP server connection by spawning the process and trying to communicate.
 * For servers that may already be running (like Unity MCP), also tries HTTP connection.
 */
async function testCommandConnection(server: CustomMcpServer, startTime: number): Promise<McpTestConnectionResult> {
  if (!server.command) {
    return {
      serverId: server.id,
      success: false,
      message: 'No command configured',
    };
  }

  // Special handling for Unity MCP - it runs inside Unity Editor and exposes HTTP
  // Check if it's already running on the default port
  if (server.id === 'unitymcp' || server.name?.toLowerCase().includes('unity')) {
    const unityMcpPorts = [6400, 6401, 6402]; // Common Unity MCP ports
    logger.info(`[MCP] Unity MCP detected, trying ports: ${unityMcpPorts.join(', ')}`);
    for (const port of unityMcpPorts) {
      try {
        logger.info(`[MCP] Testing Unity MCP on port ${port}...`);
        const httpResult = await testHttpConnectionWithUrl(
          server.id,
          `http://localhost:${port}/mcp`,
          startTime
        );
        logger.info(`[MCP] Unity MCP port ${port} result: success=${httpResult.success}, message=${httpResult.message}, error=${httpResult.error || 'none'}`);
        if (httpResult.success) {
          return {
            ...httpResult,
            message: `Unity MCP running on port ${port}`,
          };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(`[MCP] Unity MCP port ${port} failed: ${errorMsg}`);
      }
    }
    logger.warn(`[MCP] Unity MCP not found on any port. Make sure Unity Editor is running with MCP package installed.`);
  }

  return new Promise((resolve) => {
    // Defense-in-depth: Validate command and args before spawn
    if (!isCommandSafe(server.command)) {
      return resolve({
        serverId: server.id,
        success: false,
        message: `Invalid command '${server.command}' - not in allowlist`,
      });
    }
    if (!areArgsSafe(server.args)) {
      return resolve({
        serverId: server.id,
        success: false,
        message: 'Args contain dangerous flags or shell metacharacters',
      });
    }

    const args = server.args || [];

    // On Windows, use shell: true to properly handle .cmd/.bat scripts like npx
    const proc = spawn(server.command!, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000, // OS-level timeout for reliable process termination
      shell: isWindows(), // Required for Windows to run npx.cmd
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        const responseTime = Date.now() - startTime;
        resolve({
          serverId: server.id,
          success: false,
          message: 'Connection timed out',
          responseTime,
        });
      }
    }, 15000); // 15 second timeout (matches spawn timeout)

    // Send MCP initialize request
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'auto-claude-health-check',
          version: '1.0.0',
        },
      },
    }) + '\n';

    proc.stdin.write(initRequest);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();

      // Try to parse JSON response
      try {
        const lines = stdout.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.id === 1 && response.result) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              proc.kill();
              const responseTime = Date.now() - startTime;
              resolve({
                serverId: server.id,
                success: true,
                message: 'MCP server started successfully',
                responseTime,
              });
            }
            return;
          }
        }
      } catch {
        // Not valid JSON yet, keep waiting
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        resolve({
          serverId: server.id,
          success: false,
          message: 'Failed to start server',
          error: error.message,
          responseTime,
        });
      }
    });

    proc.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        if (code === 0) {
          resolve({
            serverId: server.id,
            success: true,
            message: 'Server process started',
            responseTime,
          });
        } else {
          resolve({
            serverId: server.id,
            success: false,
            message: `Server exited with code ${code}`,
            error: stderr || undefined,
            responseTime,
          });
        }
      }
    });
  });
}

/**
 * Register MCP IPC handlers.
 */
export function registerMcpHandlers(): void {
  logger.info('[MCP] ========== Registering MCP handlers ==========');

  // Quick health check
  ipcMain.handle(IPC_CHANNELS.MCP_CHECK_HEALTH, async (_event, server: CustomMcpServer) => {
    logger.info('[MCP] MCP_CHECK_HEALTH called for server:', server.id);
    try {
      const result = await checkMcpHealth(server);
      logger.info('[MCP] MCP_CHECK_HEALTH result:', result);
      return { success: true, data: result };
    } catch (error) {
      logger.error('[MCP] MCP health check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  });

  // Full connection test
  ipcMain.handle(IPC_CHANNELS.MCP_TEST_CONNECTION, async (_event, server: CustomMcpServer) => {
    logger.info(`[MCP] MCP_TEST_CONNECTION called for server: ${server.id}, ${server.name}, ${server.type}`);
    try {
      const result = await testMcpConnection(server);
      logger.info('[MCP] MCP_TEST_CONNECTION result:', result);
      return { success: true, data: result };
    } catch (error) {
      logger.error('[MCP] MCP connection test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  });

  // Translate tool descriptions
  ipcMain.handle(IPC_CHANNELS.MCP_TRANSLATE_DESCRIPTIONS, async (_event, descriptions: { name: string; description: string }[]) => {
    try {
      const result = await toolDescriptionTranslator.translateDescriptions(descriptions);
      return { success: true, data: result };
    } catch (error) {
      logger.error('MCP description translation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
      };
    }
  });

  // Clear translation cache
  ipcMain.handle(IPC_CHANNELS.MCP_CLEAR_TRANSLATION_CACHE, async () => {
    try {
      toolDescriptionTranslator.clearCache();
      return { success: true };
    } catch (error) {
      logger.error('MCP clear translation cache error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cache',
      };
    }
  });
}
