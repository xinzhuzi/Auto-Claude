/**
 * MetaMCP Custom Connection Handler
 *
 * This file contains custom logic for connecting to MetaMCP servers.
 * It is placed in the 'custom' directory to avoid being overwritten
 * during upstream merges.
 *
 * MetaMCP is a meta-MCP server that aggregates multiple MCP servers.
 * It may have specific requirements for connection testing.
 */

import type { CustomMcpServer, McpTestConnectionResult, McpHealthCheckResult, McpHealthStatus } from '../../shared/types/project';

/**
 * Test MetaMCP server connection with custom handling.
 * MetaMCP servers may use SSE (Server-Sent Events) or have specific endpoints.
 */
export async function testMetaMcpConnection(server: CustomMcpServer): Promise<McpTestConnectionResult> {
  const startTime = Date.now();

  if (!server.url) {
    return {
      serverId: server.id,
      success: false,
      message: 'No URL configured',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (server.headers) {
      Object.assign(headers, server.headers);
    }

    // First, try a simple GET request to check if server is alive
    const healthResponse = await fetch(server.url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/event-stream',
        ...(server.headers || {}),
      },
      signal: controller.signal,
    });

    // MetaMCP might return various status codes
    if (healthResponse.status === 405) {
      // Method not allowed - server is alive but doesn't accept GET
      // Try POST with MCP initialize
    } else if (!healthResponse.ok && healthResponse.status !== 200) {
      // Check if it's an auth issue
      if (healthResponse.status === 401 || healthResponse.status === 403) {
        clearTimeout(timeout);
        return {
          serverId: server.id,
          success: false,
          message: 'Authentication failed',
          error: `HTTP ${healthResponse.status}: ${healthResponse.statusText}`,
          responseTime: Date.now() - startTime,
        };
      }
    }

    // Try MCP initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'auto-claude-metamcp-test',
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

    // Handle SSE response (MetaMCP might use SSE)
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      // SSE response - server is working
      return {
        serverId: server.id,
        success: true,
        message: 'MetaMCP server connected (SSE mode)',
        responseTime,
      };
    }

    if (!response.ok) {
      // Some MetaMCP servers return non-200 but still work
      // Check if we got a valid JSON-RPC response
      try {
        const text = await response.text();
        const data = JSON.parse(text);
        if (data.result || data.id) {
          return {
            serverId: server.id,
            success: true,
            message: 'MetaMCP server connected',
            responseTime,
          };
        }
      } catch {
        // Not JSON, return error
      }

      return {
        serverId: server.id,
        success: false,
        message: `Server returned error`,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
      };
    }

    // Try to parse response
    let data;
    try {
      data = await response.json();
    } catch {
      // Response might be empty or not JSON
      return {
        serverId: server.id,
        success: true,
        message: 'MetaMCP server responded (non-JSON)',
        responseTime,
      };
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

    // Try to list tools
    let tools: string[] = [];
    try {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      };

      const toolsResponse = await fetch(server.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(toolsRequest),
      });

      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        if (toolsData.result?.tools) {
          tools = toolsData.result.tools.map((t: { name: string }) => t.name);
        }
      }
    } catch {
      // Tools listing failed, but connection succeeded
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
    } else if (errorMessage.includes('fetch')) {
      message = 'Network error - check URL and connectivity';
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
 * Check if a server URL looks like a MetaMCP server.
 */
export function isMetaMcpServer(server: CustomMcpServer): boolean {
  if (!server.url) return false;
  const url = server.url.toLowerCase();
  return (
    url.includes('metamcp') ||
    url.includes('meta-mcp') ||
    server.name?.toLowerCase().includes('metamcp') ||
    server.id?.toLowerCase().includes('metamcp')
  );
}

/**
 * Check if a server is a Unity MCP server.
 * Unity MCP requires session-based communication (POST with initialize first).
 */
export function isUnityMcpServer(server: CustomMcpServer): boolean {
  if (!server.url) return false;
  const url = server.url.toLowerCase();
  const name = (server.name || '').toLowerCase();
  const id = (server.id || '').toLowerCase();
  return (
    url.includes('unity') ||
    url.includes(':6400') ||
    url.includes(':6401') ||
    url.includes(':6402') ||
    name.includes('unity') ||
    id.includes('unity')
  );
}

/**
 * Quick health check for Unity MCP server.
 * Uses MCP protocol (POST with initialize) instead of simple GET request.
 */
export async function checkUnityMcpHealth(server: CustomMcpServer): Promise<McpHealthCheckResult> {
  const startTime = Date.now();

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
    const timeout = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (server.headers) {
      Object.assign(headers, server.headers);
    }

    // Unity MCP requires POST with initialize - GET will return 400
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

    // Get session ID from response headers
    const sessionId = response.headers.get('mcp-session-id');
    const contentType = response.headers.get('content-type') || '';

    // Handle SSE response
    if (contentType.includes('text/event-stream')) {
      return {
        serverId: server.id,
        status: 'healthy',
        message: sessionId ? 'Unity MCP connected' : 'Unity MCP responding (SSE)',
        responseTime,
        checkedAt: new Date().toISOString(),
      };
    }

    if (response.ok) {
      // Try to parse response
      try {
        const text = await response.text();
        let data;

        if (text.includes('event:') || text.includes('data:')) {
          // SSE format
          const dataLine = text.split('\n').find(line => line.startsWith('data:'));
          if (dataLine) {
            data = JSON.parse(dataLine.substring(5).trim());
          }
        } else {
          data = JSON.parse(text);
        }

        if (data?.result || data?.id) {
          return {
            serverId: server.id,
            status: 'healthy',
            statusCode: response.status,
            message: 'Unity MCP connected',
            responseTime,
            checkedAt: new Date().toISOString(),
          };
        }
      } catch {
        // Parse failed but response was OK
        return {
          serverId: server.id,
          status: 'healthy',
          statusCode: response.status,
          message: 'Unity MCP responding',
          responseTime,
          checkedAt: new Date().toISOString(),
        };
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        serverId: server.id,
        status: 'needs_auth',
        statusCode: response.status,
        message: response.status === 401 ? 'Authentication required' : 'Access forbidden',
        responseTime,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      serverId: server.id,
      status: 'unhealthy',
      statusCode: response.status,
      message: `HTTP ${response.status}: ${response.statusText}`,
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    let message = errorMessage;
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      message = 'Connection timed out';
    } else if (errorMessage.includes('ECONNREFUSED')) {
      message = 'Unity Editor not running or MCP not enabled';
    } else if (errorMessage.includes('ENOTFOUND')) {
      message = 'Server not found - check URL';
    }

    return {
      serverId: server.id,
      status: 'unhealthy',
      message,
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Quick health check for MetaMCP server.
 * Uses MCP protocol instead of simple GET request.
 */
export async function checkMetaMcpHealth(server: CustomMcpServer): Promise<McpHealthCheckResult> {
  const startTime = Date.now();

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
    const timeout = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (server.headers) {
      Object.assign(headers, server.headers);
    }

    // Send MCP initialize request for health check
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

    // Handle SSE response (MetaMCP might use SSE)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return {
        serverId: server.id,
        status: 'healthy',
        message: 'MetaMCP responding (SSE)',
        responseTime,
        checkedAt: new Date().toISOString(),
      };
    }

    if (response.ok) {
      return {
        serverId: server.id,
        status: 'healthy',
        statusCode: response.status,
        message: 'MetaMCP responding',
        responseTime,
        checkedAt: new Date().toISOString(),
      };
    }

    // Try to parse response even if not ok
    try {
      const data = await response.json();
      if (data.result || data.id) {
        return {
          serverId: server.id,
          status: 'healthy',
          statusCode: response.status,
          message: 'MetaMCP responding',
          responseTime,
          checkedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Not JSON
    }

    if (response.status === 401 || response.status === 403) {
      return {
        serverId: server.id,
        status: 'needs_auth',
        statusCode: response.status,
        message: response.status === 401 ? 'Authentication required' : 'Access forbidden',
        responseTime,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      serverId: server.id,
      status: 'unhealthy',
      statusCode: response.status,
      message: `HTTP ${response.status}: ${response.statusText}`,
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
      status: 'unhealthy',
      message,
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Enhanced HTTP connection test that handles MetaMCP servers specially.
 */
export function testHttpConnectionEnhanced(
  server: CustomMcpServer,
  originalTestFn: (server: CustomMcpServer, startTime: number) => Promise<McpTestConnectionResult>
): Promise<McpTestConnectionResult> {
  // Check if this is a MetaMCP server
  if (isMetaMcpServer(server)) {
    console.log('[MetaMCP] Detected MetaMCP server, using custom handler');
    return testMetaMcpConnection(server);
  }

  // Use original test function for other servers
  return originalTestFn(server, Date.now());
}
