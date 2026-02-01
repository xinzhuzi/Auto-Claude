/**
 * Unified MCP Session Manager
 *
 * 统一管理 MCP 工具获取和工作流执行的 Claude CLI 进程。
 * 在用户打开/创建工作流节点图时初始化，复用同一进程进行所有操作。
 *
 * 进程创建时机：
 * - 点击"创建新工作流"
 * - 打开已有工作流节点图
 *
 * 进程关闭时机：
 * - 关闭工作流编辑器
 * - 切换到其他页面
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getAPIProfileEnv } from '../../services/profile/profile-service';
import { getClaudeCliInvocationAsync } from '../../claude-cli-utils';
import { getOAuthModeClearVars } from '../../agent/env-utils';
import { getSpawnCommand, getSpawnOptions } from '../../env-utils';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface McpToolReference {
  name: string;
  description?: string;
  serverId: string;
  inputSchema?: unknown;
}

export interface SessionCallbacks {
  onOutput: (data: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

interface StreamJsonEvent {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: string;
  session_id?: string;
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
  result?: string;
  error?: string;
  is_error?: boolean;
}

// ============================================================================
// Unified MCP Session - Singleton
// ============================================================================

/**
 * Unified MCP Session Manager
 * 单例模式管理 Claude CLI 持久进程
 */
class UnifiedMcpSession extends EventEmitter {
  private static instance: UnifiedMcpSession | null = null;

  private process: ChildProcess | null = null;
  private sessionId: string | null = null;
  private projectPath: string | null = null;
  private outputBuffer: string = '';
  private isReady: boolean = false;
  private currentCallbacks: SessionCallbacks | null = null;

  // 执行锁，防止竞态条件
  private isExecuting: boolean = false;
  // Fix #4: 异步执行锁
  private executionLock: Promise<void> = Promise.resolve();
  private releaseLock: (() => void) | null = null;

  // 事件监听器引用，用于清理
  private stdoutListener: ((data: Buffer) => void) | null = null;
  private stderrListener: ((data: Buffer) => void) | null = null;
  private closeListener: ((code: number | null) => void) | null = null;
  private errorListener: ((error: Error) => void) | null = null;

  // 工具缓存
  private toolsCache: Map<string, McpToolReference[]> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): UnifiedMcpSession {
    if (!UnifiedMcpSession.instance) {
      UnifiedMcpSession.instance = new UnifiedMcpSession();
    }
    return UnifiedMcpSession.instance;
  }

  /**
   * 初始化会话 - 在打开/创建工作流节点图时调用
   */
  async initialize(projectPath: string): Promise<void> {
    // 如果已有相同项目的进程且未被杀死，直接返回
    if (this.process && !this.process.killed && this.projectPath === projectPath) {
      logger.info('[UnifiedMcpSession] Reusing existing session for:', projectPath);
      return;
    }

    // 如果有不同项目的进程，先关闭
    if (this.process && this.projectPath !== projectPath) {
      logger.info('[UnifiedMcpSession] Switching project, closing old session');
      await this.shutdown();
    }

    logger.info('[UnifiedMcpSession] Initializing session for:', projectPath);
    this.projectPath = projectPath;

    // 获取 Claude CLI 配置
    const { command: claudeCmd, env: claudeEnv } = await getClaudeCliInvocationAsync();
    logger.info('[UnifiedMcpSession] Claude CLI:', claudeCmd);

    // 获取认证环境变量
    let apiProfileEnv: Record<string, string> = {};
    try {
      apiProfileEnv = await getAPIProfileEnv();
      logger.info('[UnifiedMcpSession] Got API profile env');
    } catch (error) {
      logger.error('[UnifiedMcpSession] Failed to get API profile env:', error);
    }

    const oauthModeClearVars = getOAuthModeClearVars(apiProfileEnv);

    // 构建环境变量 - 移除冲突的认证变量
    // 注意：claudeEnv 包含增强的 PATH（包括 /opt/homebrew/bin 等），
    // 必须放在最后以确保打包应用能找到 uvx 等命令
    const {
      DEBUG: _DEBUG,
      ANTHROPIC_API_KEY: _ANTHROPIC_API_KEY,
      ANTHROPIC_AUTH_TOKEN: _ANTHROPIC_AUTH_TOKEN,
      ...cleanEnv
    } = process.env;

    const env = {
      ...cleanEnv,
      ...oauthModeClearVars,
      ...apiProfileEnv,
      ...claudeEnv,  // 放最后，确保增强的 PATH 不被覆盖
    };

    // 调试：打印 PATH 信息
    logger.info('[UnifiedMcpSession] claudeEnv PATH:', claudeEnv.PATH?.substring(0, 200));
    logger.info('[UnifiedMcpSession] final env PATH:', env.PATH?.substring(0, 200));

    // 确保无认证冲突
    if (apiProfileEnv.ANTHROPIC_AUTH_TOKEN) {
      delete (env as Record<string, string | undefined>).ANTHROPIC_API_KEY;
    }

    // 收集所有 MCP 配置文件路径
    const mcpConfigPaths = this.collectMcpConfigPaths(projectPath);
    logger.info('[UnifiedMcpSession] MCP config paths:', mcpConfigPaths);

    // 启动进程参数
    const args: string[] = [
      '--input-format=stream-json',
      '--output-format=stream-json',
      '--verbose',
    ];

    // 添加 MCP 配置参数
    if (mcpConfigPaths.length > 0) {
      args.push('--mcp-config', ...mcpConfigPaths);
    }

    logger.info('[UnifiedMcpSession] Args:', args);

    // 启动进程
    const spawnCmd = getSpawnCommand(claudeCmd);
    const spawnOpts = getSpawnOptions(claudeCmd, {
      cwd: projectPath,
      env: env as Record<string, string>,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process = spawn(spawnCmd, args, spawnOpts);
    logger.info('[UnifiedMcpSession] Process spawned, PID:', this.process.pid);

    // 设置事件处理
    this.setupProcessHandlers();

    // 等待进程就绪
    await this.waitForReady();
  }

  /**
   * 设置进程事件处理器
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    // stdout 处理
    this.stdoutListener = (data: Buffer) => {
      this.outputBuffer += data.toString();
      this.parseOutputBuffer();
    };
    this.process.stdout?.on('data', this.stdoutListener);

    // stderr 处理
    this.stderrListener = (data: Buffer) => {
      logger.warn('[UnifiedMcpSession] stderr:', data.toString());
    };
    this.process.stderr?.on('data', this.stderrListener);

    // 进程关闭
    this.closeListener = (code: number | null) => {
      logger.info('[UnifiedMcpSession] Process closed with code:', code);
      this.handleProcessClose(code);
    };
    this.process.on('close', this.closeListener);

    // 进程错误
    this.errorListener = (error: Error) => {
      logger.error('[UnifiedMcpSession] Process error:', error);
      this.handleProcessError(error);
    };
    this.process.on('error', this.errorListener);
  }

  /**
   * 移除进程事件监听器
   */
  private removeProcessHandlers(): void {
    if (!this.process) return;

    if (this.stdoutListener && this.process.stdout) {
      this.process.stdout.removeListener('data', this.stdoutListener);
    }
    if (this.stderrListener && this.process.stderr) {
      this.process.stderr.removeListener('data', this.stderrListener);
    }
    if (this.closeListener) {
      this.process.removeListener('close', this.closeListener);
    }
    if (this.errorListener) {
      this.process.removeListener('error', this.errorListener);
    }

    this.stdoutListener = null;
    this.stderrListener = null;
    this.closeListener = null;
    this.errorListener = null;
  }

  /**
   * 解析输出缓冲区
   */
  private parseOutputBuffer(): void {
    const lines = this.outputBuffer.split('\n');
    this.outputBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line) as StreamJsonEvent;
        this.handleStreamEvent(event);
      } catch (e) {
        logger.warn('[UnifiedMcpSession] Failed to parse JSON line:', line.substring(0, 100));
      }
    }
  }

  /**
   * 处理流事件
   */
  private handleStreamEvent(event: StreamJsonEvent): void {
    switch (event.type) {
      case 'system':
        if (event.session_id) {
          this.sessionId = event.session_id;
          logger.info('[UnifiedMcpSession] Session ID:', event.session_id);
        }
        this.isReady = true;
        this.emit('ready');
        break;

      case 'assistant':
        if (event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'text' && block.text) {
              // 发送输出到回调
              if (this.currentCallbacks) {
                this.currentCallbacks.onOutput(block.text);
              }
            }
          }
        }
        break;

      case 'result':
        if (this.currentCallbacks) {
          if (event.is_error || event.subtype === 'error') {
            this.currentCallbacks.onError(event.error || event.result || 'Execution failed');
          } else {
            this.currentCallbacks.onComplete();
          }
          this.currentCallbacks = null;
          this.isExecuting = false;
          // Fix #4: 释放执行锁
          this.releaseLock?.();
        }
        break;

      case 'user':
        // 用户消息回显，忽略
        break;
    }
  }

  /**
   * 等待进程就绪
   */
  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReady) {
        resolve();
        return;
      }

      const cleanup = () => {
        clearTimeout(timeout);
        this.removeListener('ready', onReady);
        this.removeListener('error', onError);
      };

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Session initialization timeout'));
      }, 30000);

      this.once('ready', onReady);
      this.once('error', onError);
    });
  }

  /**
   * 执行工作流命令
   */
  async executeCommand(
    commandName: string,
    callbacks: SessionCallbacks
  ): Promise<ChildProcess> {
    // Fix #4: 等待之前的执行完成
    await this.executionLock;

    // 创建新的锁
    let releaseLock: () => void;
    this.executionLock = new Promise(resolve => {
      releaseLock = resolve;
    });
    this.releaseLock = releaseLock!;

    if (!this.process || this.process.killed) {
      this.releaseLock?.();
      throw new Error('Session not initialized');
    }

    this.isExecuting = true;
    this.currentCallbacks = callbacks;

    const message = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: `/${commandName}`
      }
    });

    logger.info('[UnifiedMcpSession] Executing command:', commandName);

    // Fix #9: 缓存 stdin 引用并检查状态
    const stdin = this.process.stdin;
    if (!stdin || stdin.destroyed || this.process.killed) {
      this.currentCallbacks = null;
      this.isExecuting = false;
      this.releaseLock?.();
      throw new Error('Process stdin is not available');
    }

    try {
      stdin.write(message + '\n');
    } catch (error) {
      this.currentCallbacks = null;
      this.isExecuting = false;
      this.releaseLock?.();
      throw new Error(`Failed to write to stdin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return this.process;
  }

  /**
   * 发送普通消息
   */
  async sendMessage(
    content: string,
    callbacks: SessionCallbacks
  ): Promise<void> {
    // Fix #4: 等待之前的执行完成
    await this.executionLock;

    // 创建新的锁
    let releaseLock: () => void;
    this.executionLock = new Promise(resolve => {
      releaseLock = resolve;
    });
    this.releaseLock = releaseLock!;

    if (!this.process || this.process.killed) {
      this.releaseLock?.();
      throw new Error('Session not initialized');
    }

    this.isExecuting = true;
    this.currentCallbacks = callbacks;

    const message = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content
      }
    });

    // Fix #9: 缓存 stdin 引用并检查状态
    const stdin = this.process.stdin;
    if (!stdin || stdin.destroyed || this.process.killed) {
      this.currentCallbacks = null;
      this.isExecuting = false;
      this.releaseLock?.();
      throw new Error('Process stdin is not available');
    }

    try {
      stdin.write(message + '\n');
    } catch (error) {
      this.currentCallbacks = null;
      this.isExecuting = false;
      this.releaseLock?.();
      throw new Error(`Failed to write to stdin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 处理进程关闭
   */
  private handleProcessClose(code: number | null): void {
    if (this.currentCallbacks) {
      if (code !== 0) {
        this.currentCallbacks.onError(`Process exited with code ${code}`);
      }
      this.currentCallbacks = null;
    }

    this.isExecuting = false;
    // Fix #4: 释放执行锁
    this.releaseLock?.();
    this.process = null;
    this.isReady = false;
    this.sessionId = null;

    // 发出会话错误事件，通知外部
    this.emit('session-closed', code);
  }

  /**
   * 处理进程错误
   */
  private handleProcessError(error: Error): void {
    if (this.currentCallbacks) {
      this.currentCallbacks.onError(error.message);
      this.currentCallbacks = null;
    }

    this.isExecuting = false;
    // Fix #4: 释放执行锁
    this.releaseLock?.();

    // 发出会话错误事件，通知外部
    this.emit('session-error', error);
  }

  /**
   * 关闭会话
   */
  async shutdown(): Promise<void> {
    logger.info('[UnifiedMcpSession] Shutting down session');

    if (this.process && !this.process.killed) {
      // 设置退出处理器，确保清理完成
      const cleanupPromise = new Promise<void>((resolve) => {
        const exitHandler = () => {
          this.removeProcessHandlers();
          resolve();
        };
        this.process?.once('exit', exitHandler);

        // 超时回退
        setTimeout(() => {
          this.removeProcessHandlers();
          resolve();
        }, 2000);
      });

      // 先关闭 stdin，让进程有机会优雅退出
      if (this.process.stdin && !this.process.stdin.destroyed) {
        this.process.stdin.end();
      }

      // 给进程一点时间优雅退出
      await new Promise(resolve => setTimeout(resolve, 100));

      // 如果进程还在运行，发送 SIGTERM
      if (!this.process.killed) {
        this.process.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 500));

        // 如果还在运行，强制杀死
        if (!this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }

      await cleanupPromise;
    } else {
      this.removeProcessHandlers();
    }

    this.process = null;
    this.sessionId = null;
    this.projectPath = null;
    this.isReady = false;
    this.isExecuting = false;
    this.currentCallbacks = null;
    this.toolsCache.clear();
    this.outputBuffer = '';
  }

  /**
   * 停止当前执行
   */
  stopExecution(): void {
    if (this.currentCallbacks) {
      this.currentCallbacks.onError('Execution stopped by user');
      this.currentCallbacks = null;
    }
    this.isExecuting = false;
  }

  /**
   * 清除工具缓存
   */
  clearToolsCache(serverId?: string): void {
    if (serverId) {
      this.toolsCache.delete(serverId);
    } else {
      this.toolsCache.clear();
    }
  }

  /**
   * 获取会话状态
   */
  getStatus(): {
    active: boolean;
    ready: boolean;
    busy: boolean;
    projectPath: string | null;
    sessionId: string | null;
  } {
    return {
      active: this.process !== null && !this.process.killed,
      ready: this.isReady,
      busy: this.isExecuting || this.currentCallbacks !== null,
      projectPath: this.projectPath,
      sessionId: this.sessionId,
    };
  }

  /**
   * 检查是否有活跃会话
   */
  hasActiveSession(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * 获取进程引用（用于外部跟踪）
   */
  getProcess(): ChildProcess | null {
    return this.process;
  }

  /**
   * 收集所有 MCP 配置文件路径
   * Claude CLI 会自动读取这些配置文件中的服务器
   * 
   * Claude Code v2.1+ 使用 mcp.json (无前导点)
   * 旧版本使用 .mcp.json (有前导点)
   */
  private collectMcpConfigPaths(projectPath: string): string[] {
    const configPaths: string[] = [];

    logger.info(`[UnifiedMcpSession] collectMcpConfigPaths called with projectPath: ${projectPath}`);
    logger.info(`[UnifiedMcpSession] Home directory: ${os.homedir()}`);

    // Helper: 检查文件是否存在并添加
    const tryAddConfig = (configPath: string, description: string) => {
      logger.info(`[UnifiedMcpSession] Checking ${description}: ${configPath}`);
      if (fs.existsSync(configPath)) {
        configPaths.push(configPath);
        logger.info(`[UnifiedMcpSession] ✓ Found ${description}: ${configPath}`);
        return true;
      }
      logger.info(`[UnifiedMcpSession] ✗ Not found: ${configPath}`);
      return false;
    };

    // 1. 项目级 MCP 配置
    // 优先 mcp.json (v2.1+)，回退 .mcp.json (旧版)
    if (!tryAddConfig(path.join(projectPath, 'mcp.json'), 'project mcp.json')) {
      tryAddConfig(path.join(projectPath, '.mcp.json'), 'project .mcp.json (legacy)');
    }

    // 2. 用户级 MCP 配置 (~/)
    if (!tryAddConfig(path.join(os.homedir(), 'mcp.json'), 'user mcp.json')) {
      tryAddConfig(path.join(os.homedir(), '.mcp.json'), 'user .mcp.json (legacy)');
    }

    // 3. ~/.claude/mcp.json (v2.1+) 或 ~/.claude/.mcp.json (旧版)
    if (!tryAddConfig(path.join(os.homedir(), '.claude', 'mcp.json'), '~/.claude/mcp.json')) {
      tryAddConfig(path.join(os.homedir(), '.claude', '.mcp.json'), '~/.claude/.mcp.json (legacy)');
    }

    // 4. 项目级 .claude/mcp.json (v2.1+) 或 .claude/.mcp.json (旧版)
    if (!tryAddConfig(path.join(projectPath, '.claude', 'mcp.json'), 'project .claude/mcp.json')) {
      tryAddConfig(path.join(projectPath, '.claude', '.mcp.json'), 'project .claude/.mcp.json (legacy)');
    }

    return configPaths;
  }
}

// 导出单例
export const unifiedMcpSession = UnifiedMcpSession.getInstance();
