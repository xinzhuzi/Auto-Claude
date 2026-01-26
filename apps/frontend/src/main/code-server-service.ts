/**
 * Code-Server Service
 *
 * Manages code-server processes in the main process.
 * This service runs in the main process where Node.js APIs are available.
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';
import * as http from 'http';
import * as net from 'net';
import * as os from 'os';
import log from 'electron-log/main.js';

// ES module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CodeServerInstance {
  process: ReturnType<typeof spawn>;
  port: number;
  projectPath: string;
  startTime: number;
}

/**
 * Port pool for managing code-server port allocations
 */
class PortPool {
  private startPort = 18080;
  private allocatedPorts = new Set<number>();

  /**
   * Check if a port is actually available on the system
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false); // Port is in use
        } else {
          resolve(true); // Other error, assume available
        }
      });

      server.once('listening', () => {
        server.close(() => resolve(true)); // Port is available
      });

      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Allocate an available port
   * This method actually checks if the port is available on the system
   * @param preferredPort Optional preferred port to use first
   */
  async allocate(preferredPort?: number): Promise<number> {
    // If preferred port is specified, try it first
    if (preferredPort !== undefined) {
      // Skip if already allocated in our pool
      if (!this.allocatedPorts.has(preferredPort)) {
        // Check if port is actually available on the system
        const isAvailable = await this.isPortAvailable(preferredPort);
        if (isAvailable) {
          this.allocatedPorts.add(preferredPort);
          log.info(`[PortPool] Allocated preferred port: ${preferredPort}`);
          return preferredPort;
        }
        log.warn(`[PortPool] Preferred port ${preferredPort} is in use, trying alternative...`);
      } else {
        log.warn(`[PortPool] Preferred port ${preferredPort} already allocated, trying alternative...`);
      }
    }

    // Find next available port
    for (let port = this.startPort; port < this.startPort + 1000; port++) {
      // Skip if already allocated in our pool
      if (this.allocatedPorts.has(port)) {
        continue;
      }

      // Check if port is actually available on the system
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        this.allocatedPorts.add(port);
        log.info(`[PortPool] Allocated port: ${port}`);
        return port;
      }

      // Port is in use by another process, try next
      log.warn(`[PortPool] Port ${port} is in use, trying next port...`);
    }

    throw new Error('No available ports in range 18080-19080');
  }

  /**
   * Public method to check if a specific port is available
   */
  async checkAvailable(port: number): Promise<boolean> {
    // Skip if already allocated in our pool
    if (this.allocatedPorts.has(port)) {
      return false;
    }
    return this.isPortAvailable(port);
  }

  release(port: number): void {
    this.allocatedPorts.delete(port);
  }

  isAllocated(port: number): boolean {
    return this.allocatedPorts.has(port);
  }
}

const portPool = new PortPool();

/**
 * Code-Server Service
 *
 * Manages multiple code-server instances.
 */
export class CodeServerService extends EventEmitter {
  private instances: Map<string, CodeServerInstance> = new Map();
  private projectPorts: Map<string, number> = new Map();
  private static processCache: Map<string, CodeServerInstance> = new Map();

  /**
   * Get code-server binary path
   */
  private getCodeServerPath(): string {
    // Use platform-specific directory and filename:
    // - Windows: code-server-4.108.0-win/bin/code-server.cmd
    // - Mac/Linux: code-server-4.108.0/bin/code-server
    const isWindows = process.platform === 'win32';
    const libDir = isWindows ? 'code-server-4.108.0-win' : 'code-server-4.108.0';
    const binaryName = isWindows ? 'code-server.cmd' : 'code-server';

    if (app.isPackaged) {
      // Production: use packaged code-server (lib directory only, no symlinks)
      return path.join(process.resourcesPath, 'code-server', 'lib', libDir, 'bin', binaryName);
    } else {
      // Development: use local code-server via bin symlink
      return path.join(__dirname, '../../../code-server', 'bin', binaryName);
    }
  }

  /**
   * Check if code-server exists
   */
  private checkCodeServerExists(): boolean {
    const codeServerPath = this.getCodeServerPath();
    return existsSync(codeServerPath);
  }

  /**
   * Check if Node.js version is compatible with code-server
   * code-server requires Node.js 22+, but Node.js 24+ also works (tested)
   */
  private checkNodeVersion(): { compatible: boolean; message?: string } {
    const nodeVersion = process.versions.node;
    const majorVersion = parseInt(nodeVersion.split('.')[0]);

    if (majorVersion < 22) {
      return {
        compatible: false,
        message: `code-server requires Node.js 22+, but you have ${nodeVersion}. Please upgrade Node.js.`
      };
    }

    if (majorVersion > 22) {
      log.warn(`[CodeServerService] Using Node.js ${nodeVersion} with code-server (requires 22.x). This is untested but should work.`);
    }

    return { compatible: true };
  }

  /**
   * Check if a process is still alive
   * Uses cross-platform approach instead of signal 0 (POSIX-only)
   */
  private isProcessAlive(instance: CodeServerInstance): boolean {
    // Use built-in process properties (cross-platform compatible)
    const proc = instance.process;
    return (
      !proc.killed &&
      proc.exitCode === null &&
      proc.pid !== undefined &&
      proc.pid > 0
    );
  }

  /**
   * Start a code-server instance for a project
   */
  async start(projectPath: string, preferredPort?: number): Promise<{
    success: boolean;
    port?: number;
    url?: string;
    error?: string;
  }> {
    try {
      // Check if code-server exists
      if (!this.checkCodeServerExists()) {
        return {
          success: false,
          error: 'code-server not found. Please install code-server first.'
        };
      }

      // Check Node.js version compatibility
      const versionCheck = this.checkNodeVersion();
      if (!versionCheck.compatible) {
        return {
          success: false,
          error: versionCheck.message
        };
      }

      // Check cache first for faster startup
      const cachedInstance = CodeServerService.processCache.get(projectPath);
      if (cachedInstance && this.isProcessAlive(cachedInstance)) {
        log.info('[CodeServerService] Using cached process for:', projectPath);
        // Update coder.json to ensure it points to the correct project
        // This is important when switching between projects
        const platform = process.platform;
        const normalizedPath = platform === 'win32'
          ? projectPath.replace(/\\/g, '/')
          : projectPath;

        // Add leading slash for code-server format
        // macOS/Linux paths already start with /, so don't add another
        // Windows paths don't start with /, so add it
        const folderPath = platform === 'win32' ? `/${normalizedPath}` : normalizedPath;

        try {
          let codeServerDataDir: string;

          if (platform === 'win32') {
            codeServerDataDir = path.join(os.homedir(), 'AppData', 'Local', 'code-server', 'Data');
          } else {
            // Both macOS and Linux use .local/share/code-server
            codeServerDataDir = path.join(os.homedir(), '.local', 'share', 'code-server');
          }

          const coderJsonPath = path.join(codeServerDataDir, 'coder.json');
          const coderContent = JSON.stringify({ query: { folder: folderPath } }, null, 2);

          // Ensure directory exists
          if (!existsSync(codeServerDataDir)) {
            mkdirSync(codeServerDataDir, { recursive: true });
          }

          writeFileSync(coderJsonPath, coderContent, 'utf-8');
          log.info('[CodeServerService] Updated coder.json for cached instance:', folderPath);
        } catch (err) {
          log.warn('[CodeServerService] Failed to update coder.json:', err);
          // Continue anyway - the server is already running
        }

        return {
          success: true,
          port: cachedInstance.port,
          url: `http://127.0.0.1:${cachedInstance.port}/`
        };
      }

      // Clean up dead cache entries
      if (cachedInstance && !this.isProcessAlive(cachedInstance)) {
        log.warn('[CodeServerService] Removing dead cached process for:', projectPath);
        CodeServerService.processCache.delete(projectPath);
        portPool.release(cachedInstance.port);
      }

      // Check if already running for this project (in current session)
      const existingInstance = this.instances.get(projectPath);
      if (existingInstance) {
        return {
          success: true,
          port: existingInstance.port,
          url: `http://127.0.0.1:${existingInstance.port}/`
        };
      }

      // Allocate port (checks actual port availability atomically)
      // This eliminates race conditions by checking and allocating in one operation
      const port = await portPool.allocate(preferredPort);
      log.info(`[CodeServerService] Allocated port ${port} for project: ${projectPath}`);

      // Get code-server path
      const codeServerPath = this.getCodeServerPath();

      // Build args
      // Note: code-server doesn't support --folder-uri parameter
      // Instead, pass the project path directly as a positional argument
      // IMPORTANT: On Windows, convert backslashes to forward slashes for code-server
      // CRITICAL: All native modules (@vscode/watcher, windows-ca-certs, kerberos)
      // must be compiled using node-gyp rebuild to avoid ENOPRO errors
      const platform = process.platform;
      const normalizedPath = platform === 'win32'
        ? projectPath.replace(/\\/g, '/')
        : projectPath;

      // Add leading slash for code-server format
      // macOS/Linux paths already start with /, so don't add another
      // Windows paths don't start with /, so add it
      const folderPath = platform === 'win32' ? `/${normalizedPath}` : normalizedPath;

      // Update coder.json to set the correct folder path
      // This prevents code-server from reopening the previous folder
      try {
        let codeServerDataDir: string;

        if (platform === 'win32') {
          codeServerDataDir = path.join(os.homedir(), 'AppData', 'Local', 'code-server', 'Data');
        } else {
          // Both macOS and Linux use .local/share/code-server
          codeServerDataDir = path.join(os.homedir(), '.local', 'share', 'code-server');
        }

        const coderJsonPath = path.join(codeServerDataDir, 'coder.json');
        const coderContent = JSON.stringify({ query: { folder: folderPath } }, null, 2);

        // Ensure directory exists
        if (!existsSync(codeServerDataDir)) {
          mkdirSync(codeServerDataDir, { recursive: true });
        }

        writeFileSync(coderJsonPath, coderContent, 'utf-8');
        log.info('[CodeServerService] Updated coder.json with folder:', folderPath);
      } catch (err) {
        log.warn('[CodeServerService] Failed to update coder.json:', err);
        // Continue anyway - this is not critical
      }

      const args = [
        '--bind-addr', `127.0.0.1:${port}`,
        '--auth', 'none',
        '--disable-update-check',
        '--disable-telemetry',
        normalizedPath // Pass normalized path (forward slashes on Windows)
      ];

      log.info('[CodeServerService] Starting code-server:', {
        port,
        originalPath: projectPath,
        normalizedPath,
        args: args.join(' ')
      });

      // Spawn process
      const isWindows = process.platform === 'win32';
      const codeServerProcess = spawn(codeServerPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PASSWORD: ''
        },
        // Windows-specific options
        ...(isWindows && {
          shell: true, // Required for .cmd files on Windows
        }),
        ...(isWindows && {
          windowsHide: true // Hide console window on Windows only
        })
      });

      // Create instance
      const instance: CodeServerInstance = {
        process: codeServerProcess,
        port,
        projectPath,
        startTime: Date.now()
      };

      this.instances.set(projectPath, instance);
      this.projectPorts.set(projectPath, port);

      // Handle stdout
      codeServerProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        log.info('[code-server stdout]', output.trim());
      });

      // Handle stderr
      codeServerProcess.stderr?.on('data', (data: Buffer) => {
        const error = data.toString();

        // Filter out harmless warnings and errors
        // 1. spdlog watchdog module errors (Windows doesn't have this module)
        if (error.includes('Cannot find module') && error.includes('watchdog')) {
          log.debug('[code-server stderr] Filtered: watchdog module error (Windows doesn\'t have this module)');
          return;
        }
        if (error.includes('bindings') && error.includes('watchdog')) {
          log.debug('[code-server stderr] Filtered: watchdog bindings error (Windows doesn\'t have this module)');
          return;
        }
        // Only filter spdlog watchdog errors, not other spdlog errors (macOS/Linux use spdlog)
        if (error.includes('@vscode/spdlog') && error.includes('watchdog')) {
          log.debug('[code-server stderr] Filtered: spdlog watchdog error (Windows doesn\'t have this module)');
          return;
        }

        // 2. Service Worker registration errors (Windows only, macOS doesn't have this issue)
        if (process.platform === 'win32') {
          if (error.includes('Service Worker') && error.includes('registration')) {
            log.debug('[code-server stderr] Filtered: Service Worker registration error (Windows compatibility)');
            return;
          }
          if (error.includes('Failed to register a ServiceWorker')) {
            log.debug('[code-server stderr] Filtered: Service Worker registration failed (Windows compatibility)');
            return;
          }
        }

        // 3. Node.js version mismatch (we use Node 24, code-server wants 22)
        if (error.includes('node') && error.includes('version') && error.includes('22')) {
          log.warn('[code-server stderr] Node.js version warning (can be ignored)');
          log.debug('[code-server stderr] Filtered: Node.js version mismatch warning');
          return;
        }

        // Output other errors
        log.error('[code-server stderr]', error.trim());
      });

      // Handle exit
      codeServerProcess.on('exit', (code, signal) => {
        log.info(`[code-server] Exited: ${projectPath}, code=${code}, signal=${signal}`);
        this.instances.delete(projectPath);
        this.projectPorts.delete(projectPath);
        CodeServerService.processCache.delete(projectPath); // Remove from cache
        portPool.release(port);
        this.emit('stopped', { projectPath, port, code, signal });
      });

      // Handle error
      codeServerProcess.on('error', (err) => {
        log.error('[code-server] Process error:', err);
        this.instances.delete(projectPath);
        this.projectPorts.delete(projectPath);
        CodeServerService.processCache.delete(projectPath);
        portPool.release(port);
        this.emit('error', { projectPath, error: err });
      });

      // Wait for server to be ready
      try {
        await this.waitForReady(port);
        log.info(`[CodeServerService] ✓ Server confirmed ready at port ${port}`);
      } catch (waitError) {
        // Server failed to become ready, clean up zombie process
        log.error(`[CodeServerService] Server failed to become ready: ${waitError}`);
        log.error(`[CodeServerService] Cleaning up zombie process for port ${port}`);

        // Kill the zombie process
        try {
          codeServerProcess.kill('SIGKILL');
        } catch (killError) {
          log.warn('[CodeServerService] Failed to kill zombie process:', killError);
        }

        // Clean up state
        this.instances.delete(projectPath);
        this.projectPorts.delete(projectPath);
        CodeServerService.processCache.delete(projectPath);
        portPool.release(port);

        throw waitError;
      }

      // Emit started event after server is actually ready
      this.emit('started', { projectPath, port });

      // Add to cache for faster restarts
      CodeServerService.processCache.set(projectPath, instance);
      log.info('[CodeServerService] Cached process for:', projectPath);

      // Return URL
      // code-server will automatically handle the project path via redirect
      return {
        success: true,
        port,
        url: `http://127.0.0.1:${port}/`
      };
    } catch (error) {
      log.error('[CodeServerService] Failed to start:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Stop a code-server instance
   * Uses platform-specific process termination for better compatibility
   */
  stop(projectPath: string): { success: boolean; error?: string } {
    const instance = this.instances.get(projectPath);
    if (!instance) {
      return {
        success: false,
        error: 'No code-server instance found for this project'
      };
    }

    log.info('[CodeServerService] Stopping:', projectPath);

    // Platform-specific process termination
    // Windows doesn't support SIGTERM, use taskkill for graceful shutdown
    if (process.platform === 'win32') {
      // Use taskkill for graceful shutdown on Windows
      spawn('taskkill', ['/PID', String(instance.process.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
    } else {
      // Unix-like systems support SIGTERM for graceful shutdown
      instance.process.kill('SIGTERM');
    }

    // Force kill after 5 seconds if process is still alive
    setTimeout(() => {
      if (this.isProcessAlive(instance)) {
        log.warn('[CodeServerService] Force killing:', projectPath);
        if (process.platform === 'win32') {
          // Windows: use taskkill again to ensure termination
          spawn('taskkill', ['/PID', String(instance.process.pid), '/F'], {
            stdio: 'ignore',
            windowsHide: true
          });
        } else {
          // Unix: use SIGKILL
          instance.process.kill('SIGKILL');
        }
      }
    }, 5000);

    this.instances.delete(projectPath);
    this.projectPorts.delete(projectPath);

    return { success: true };
  }

  /**
   * Get server info for a project
   * Checks both current session instances and cached instances
   */
  getInfo(projectPath: string): {
    running: boolean;
    port?: number;
    url?: string;
  } {
    // Check current session instances first
    let instance = this.instances.get(projectPath);

    // If not found in current session, check process cache
    if (!instance) {
      instance = CodeServerService.processCache.get(projectPath);
      if (instance) {
        // Verify the cached process is still alive
        if (this.isProcessAlive(instance)) {
          log.info('[CodeServerService] Found running instance in cache for:', projectPath);
        } else {
          // Process is dead, remove from cache
          log.warn('[CodeServerService] Cached instance is dead, removing from cache:', projectPath);
          CodeServerService.processCache.delete(projectPath);
          portPool.release(instance.port);
          instance = undefined;
        }
      }
    }

    if (!instance) {
      return { running: false };
    }

    // Convert Windows backslashes to forward slashes for URL
    return {
      running: true,
      port: instance.port,
      url: `http://127.0.0.1:${instance.port}/`
    };
  }

  /**
   * Stop all instances and wait for them to fully terminate
   * This ensures all processes are killed before app exits
   */
  async stopAll(): Promise<void> {
    log.info('[CodeServerService] Stopping all instances');

    const allInstances = new Map<string, CodeServerInstance>();

    // Collect all instances from both maps
    for (const [projectPath, instance] of this.instances.entries()) {
      allInstances.set(projectPath, instance);
    }
    for (const [projectPath, instance] of CodeServerService.processCache.entries()) {
      if (!allInstances.has(projectPath)) {
        allInstances.set(projectPath, instance);
      }
    }

    // Send SIGTERM to all instances
    for (const [projectPath, instance] of allInstances.entries()) {
      try {
        log.info('[CodeServerService] Stopping instance for:', projectPath);
        instance.process.kill('SIGTERM');
      } catch (err) {
        log.warn('[CodeServerService] Failed to send SIGTERM to', projectPath, err);
      }
    }

    // Clear the maps
    this.instances.clear();
    this.projectPorts.clear();
    CodeServerService.processCache.clear();

    // Wait up to 3 seconds for processes to exit gracefully
    const maxWaitTime = 3000;
    const startTime = Date.now();
    const remainingProcesses = new Set<CodeServerInstance>();

    // Check which processes are still alive
    for (const instance of allInstances.values()) {
      if (this.isProcessAlive(instance)) {
        remainingProcesses.add(instance);
      }
    }

    // Wait for graceful shutdown
    while (remainingProcesses.size > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Remove dead processes
      for (const instance of remainingProcesses) {
        if (!this.isProcessAlive(instance)) {
          remainingProcesses.delete(instance);
        }
      }
    }

    // Force kill any remaining processes
    if (remainingProcesses.size > 0) {
      log.warn(`[CodeServerService] ${remainingProcesses.size} processes still alive, force killing...`);
      for (const instance of remainingProcesses) {
        try {
          // Platform-specific force kill
          if (process.platform === 'win32') {
            // Windows: use taskkill for reliable termination
            spawn('taskkill', ['/PID', String(instance.process.pid), '/F'], {
              stdio: 'ignore',
              windowsHide: true
            });
          } else {
            // Unix: use SIGKILL
            instance.process.kill('SIGKILL');
          }
        } catch (err) {
          log.warn('[CodeServerService] Failed to force kill process:', err);
        }
      }
    }

    // Release all ports
    for (const instance of allInstances.values()) {
      portPool.release(instance.port);
    }

    log.info('[CodeServerService] All instances stopped');
  }

  /**
   * Wait for server to be ready with polling
   */
  private async waitForReady(port: number, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    const url = `http://127.0.0.1:${port}`;
    let attemptCount = 0;

    log.info(`[CodeServerService] Waiting for server to be ready at ${url} (timeout: ${timeout}ms)`);

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(() => {
        attemptCount++;
        const elapsed = Date.now() - startTime;

        if (elapsed > timeout) {
          clearInterval(pollInterval);
          log.error(`[CodeServerService] Server ready timeout after ${attemptCount} attempts (${elapsed}ms)`);
          reject(new Error(`Code-server start timeout after ${timeout}ms`));
          return;
        }

        // Try to connect to the server
        const req = http.get(url, (res) => {
          // Success! Server is ready
          clearInterval(pollInterval);
          log.info(`[CodeServerService] ✓ Server ready at ${url} after ${attemptCount} attempts (${elapsed}ms), status: ${res.statusCode}`);
          req.destroy();
          resolve();
        });

        req.on('error', (err) => {
          // Server not ready yet, will retry on next interval
          log.debug(`[CodeServerService] Attempt ${attemptCount} failed: ${err.message}`);
          req.destroy();
        });

        req.setTimeout(1000, () => {
          // Request timeout, will retry on next interval
          log.debug(`[CodeServerService] Attempt ${attemptCount} timeout after 1s`);
          req.destroy();
        });
      }, 2000); // Poll every 2 seconds
    });
  }
}

// Singleton instance
let codeServerService: CodeServerService | null = null;

export function getCodeServerService(): CodeServerService {
  if (!codeServerService) {
    codeServerService = new CodeServerService();
  }
  return codeServerService;
}
