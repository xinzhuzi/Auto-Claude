import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { app } from 'electron';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { EventEmitter } from 'events';
import { detectRateLimit, createSDKRateLimitInfo, getBestAvailableProfileEnv } from './rate-limit-detector';
import { parsePythonCommand, getValidatedPythonPath } from './python-detector';
import { getConfiguredPythonPath } from './python-env-manager';
import { getAPIProfileEnv } from './services/profile';
import { getOAuthModeClearVars } from './agent/env-utils';

/**
 * Debug logging - only logs when DEBUG=true or in development mode
 */
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.warn('[ToolDescriptionTranslator]', ...args);
  }
}

interface TranslationCache {
  [key: string]: {
    translation: string;
    timestamp: number;
  };
}

/**
 * Service for translating MCP tool descriptions from English to Chinese using Claude AI
 */
export class ToolDescriptionTranslator extends EventEmitter {
  private _pythonPath: string | null = null;
  private autoBuildSourcePath: string = '';
  private cache: TranslationCache = {};
  private cacheFilePath: string = '';
  private readonly CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    super();
    debug('ToolDescriptionTranslator initialized');
    this.initCache();
  }

  private initCache(): void {
    try {
      const userDataPath = app.getPath('userData');
      const cacheDir = path.join(userDataPath, 'cache');
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      this.cacheFilePath = path.join(cacheDir, 'tool-description-translations.json');
      
      if (existsSync(this.cacheFilePath)) {
        const cacheContent = readFileSync(this.cacheFilePath, 'utf-8');
        this.cache = JSON.parse(cacheContent);
        debug('Loaded translation cache with', Object.keys(this.cache).length, 'entries');
      }
    } catch (err) {
      debug('Failed to load translation cache:', err);
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      debug('Failed to save translation cache:', err);
    }
  }

  private getCacheKey(text: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `desc_${hash}`;
  }

  configure(pythonPath?: string, autoBuildSourcePath?: string): void {
    if (pythonPath) {
      this._pythonPath = getValidatedPythonPath(pythonPath, 'ToolDescriptionTranslator');
    }
    if (autoBuildSourcePath) {
      this.autoBuildSourcePath = autoBuildSourcePath;
    }
  }

  private get pythonPath(): string {
    if (this._pythonPath) {
      return this._pythonPath;
    }
    return getConfiguredPythonPath();
  }

  private getAutoBuildSourcePath(): string | null {
    if (this.autoBuildSourcePath && existsSync(this.autoBuildSourcePath)) {
      return this.autoBuildSourcePath;
    }

    const possiblePaths = [
      path.resolve(__dirname, '..', '..', '..', 'backend'),
      path.resolve(app.getAppPath(), '..', 'backend'),
      path.resolve(process.cwd(), 'apps', 'backend')
    ];

    for (const p of possiblePaths) {
      if (existsSync(p) && existsSync(path.join(p, 'runners', 'spec_runner.py'))) {
        return p;
      }
    }
    return null;
  }

  private loadAutoBuildEnv(): Record<string, string> {
    const autoBuildSource = this.getAutoBuildSourcePath();
    if (!autoBuildSource) return {};

    const envPath = path.join(autoBuildSource, '.env');
    if (!existsSync(envPath)) return {};

    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const envVars: Record<string, string> = {};

      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          let value = trimmed.substring(eqIndex + 1).trim();

          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          envVars[key] = value;
        }
      }

      return envVars;
    } catch {
      return {};
    }
  }

  /**
   * Translate a single tool description
   */
  async translateDescription(description: string): Promise<string> {
    if (!description || description.trim().length === 0) {
      return description;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(description);
    const cached = this.cache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY_MS) {
      debug('Using cached translation for:', description.substring(0, 50));
      return cached.translation;
    }

    const autoBuildSource = this.getAutoBuildSourcePath();
    if (!autoBuildSource) {
      debug('Auto-claude source path not found, returning original');
      return description;
    }

    const translation = await this.callTranslationAPI(description, autoBuildSource);
    
    if (translation && translation !== description) {
      // Cache the result
      this.cache[cacheKey] = {
        translation,
        timestamp: Date.now()
      };
      this.saveCache();
    }

    return translation || description;
  }

  /**
   * Translate multiple tool descriptions in batch
   */
  async translateDescriptions(descriptions: { name: string; description: string }[]): Promise<{ name: string; description: string }[]> {
    const results: { name: string; description: string }[] = [];
    
    // Filter out items that need translation
    const needsTranslation: { index: number; name: string; description: string }[] = [];
    
    for (let i = 0; i < descriptions.length; i++) {
      const item = descriptions[i];
      if (!item.description || item.description.trim().length === 0) {
        results[i] = item;
        continue;
      }

      const cacheKey = this.getCacheKey(item.description);
      const cached = this.cache[cacheKey];
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY_MS) {
        results[i] = { name: item.name, description: cached.translation };
      } else {
        needsTranslation.push({ index: i, ...item });
        results[i] = item; // Placeholder
      }
    }

    if (needsTranslation.length === 0) {
      return results;
    }

    const autoBuildSource = this.getAutoBuildSourcePath();
    if (!autoBuildSource) {
      debug('Auto-claude source path not found, returning originals');
      return descriptions;
    }

    // Batch translate (up to 10 at a time to avoid token limits)
    const batchSize = 10;
    for (let i = 0; i < needsTranslation.length; i += batchSize) {
      const batch = needsTranslation.slice(i, i + batchSize);
      const batchDescriptions = batch.map(b => `${b.name}: ${b.description}`).join('\n---\n');
      
      const translation = await this.callBatchTranslationAPI(batchDescriptions, autoBuildSource);
      
      if (translation) {
        const translatedParts = translation.split('\n---\n');
        for (let j = 0; j < batch.length && j < translatedParts.length; j++) {
          const translatedPart = translatedParts[j].trim();
          const colonIndex = translatedPart.indexOf(':');
          if (colonIndex > 0) {
            const translatedDesc = translatedPart.substring(colonIndex + 1).trim();
            results[batch[j].index] = { name: batch[j].name, description: translatedDesc };
            
            // Cache the result
            const cacheKey = this.getCacheKey(batch[j].description);
            this.cache[cacheKey] = {
              translation: translatedDesc,
              timestamp: Date.now()
            };
          }
        }
      }
    }

    this.saveCache();
    return results;
  }

  private async callTranslationAPI(description: string, autoBuildSource: string): Promise<string | null> {
    const prompt = this.createTranslationPrompt(description);
    const script = this.createTranslationScript(prompt);

    debug('Translating description:', description.substring(0, 100) + '...');

    const autoBuildEnv = this.loadAutoBuildEnv();
    const apiProfileEnv = await getAPIProfileEnv();
    const isApiProfileActive = Object.keys(apiProfileEnv).length > 0;

    let profileEnv: Record<string, string> = {};
    if (!isApiProfileActive) {
      const profileResult = getBestAvailableProfileEnv();
      profileEnv = profileResult.env;
    }

    const oauthModeClearVars = getOAuthModeClearVars(apiProfileEnv);

    return new Promise((resolve) => {
      const [pythonCommand, pythonBaseArgs] = parsePythonCommand(this.pythonPath);
      const childProcess = spawn(pythonCommand, [...pythonBaseArgs, '-c', script], {
        cwd: autoBuildSource,
        env: {
          ...process.env,
          ...autoBuildEnv,
          ...profileEnv,
          ...apiProfileEnv,
          ...oauthModeClearVars,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });

      let output = '';
      let errorOutput = '';
      const timeout = setTimeout(() => {
        console.warn('[ToolDescriptionTranslator] Translation timed out after 30s');
        childProcess.kill();
        resolve(null);
      }, 30000);

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      childProcess.on('exit', (code: number | null) => {
        clearTimeout(timeout);

        if (code === 0 && output.trim()) {
          const translation = output.trim();
          debug('Translated:', translation);
          resolve(translation);
        } else {
          const combinedOutput = `${output}\n${errorOutput}`;
          const rateLimitDetection = detectRateLimit(combinedOutput);
          if (rateLimitDetection.isRateLimited) {
            console.warn('[ToolDescriptionTranslator] Rate limit detected');
            const rateLimitInfo = createSDKRateLimitInfo('other', rateLimitDetection);
            this.emit('sdk-rate-limit', rateLimitInfo);
          }

          console.warn('[ToolDescriptionTranslator] Translation failed', {
            code,
            errorOutput: errorOutput.substring(0, 500)
          });
          resolve(null);
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.warn('[ToolDescriptionTranslator] Process error:', err.message);
        resolve(null);
      });
    });
  }

  private async callBatchTranslationAPI(descriptions: string, autoBuildSource: string): Promise<string | null> {
    const prompt = this.createBatchTranslationPrompt(descriptions);
    const script = this.createTranslationScript(prompt);

    debug('Batch translating descriptions...');

    const autoBuildEnv = this.loadAutoBuildEnv();
    const apiProfileEnv = await getAPIProfileEnv();
    const isApiProfileActive = Object.keys(apiProfileEnv).length > 0;

    let profileEnv: Record<string, string> = {};
    if (!isApiProfileActive) {
      const profileResult = getBestAvailableProfileEnv();
      profileEnv = profileResult.env;
    }

    const oauthModeClearVars = getOAuthModeClearVars(apiProfileEnv);

    return new Promise((resolve) => {
      const [pythonCommand, pythonBaseArgs] = parsePythonCommand(this.pythonPath);
      const childProcess = spawn(pythonCommand, [...pythonBaseArgs, '-c', script], {
        cwd: autoBuildSource,
        env: {
          ...process.env,
          ...autoBuildEnv,
          ...profileEnv,
          ...apiProfileEnv,
          ...oauthModeClearVars,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });

      let output = '';
      let errorOutput = '';
      const timeout = setTimeout(() => {
        console.warn('[ToolDescriptionTranslator] Batch translation timed out after 60s');
        childProcess.kill();
        resolve(null);
      }, 60000);

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      childProcess.on('exit', (code: number | null) => {
        clearTimeout(timeout);

        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          console.warn('[ToolDescriptionTranslator] Batch translation failed', {
            code,
            errorOutput: errorOutput.substring(0, 500)
          });
          resolve(null);
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.warn('[ToolDescriptionTranslator] Process error:', err.message);
        resolve(null);
      });
    });
  }

  private createTranslationPrompt(description: string): string {
    return `将以下MCP工具描述从英文翻译成简洁的中文。保持技术术语准确，翻译要简洁明了。只输出翻译结果，不要任何解释。

英文描述：
${description}

中文翻译：`;
  }

  private createBatchTranslationPrompt(descriptions: string): string {
    return `将以下MCP工具描述从英文翻译成简洁的中文。保持技术术语准确，翻译要简洁明了。
保持原有格式，每个工具用 "---" 分隔，格式为 "工具名: 翻译后的描述"。只输出翻译结果。

${descriptions}`;
  }

  private createTranslationScript(prompt: string): string {
    const escapedPrompt = JSON.stringify(prompt);

    return `
import asyncio
import sys

async def translate():
    try:
        from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

        prompt = ${escapedPrompt}

        client = ClaudeSDKClient(
            options=ClaudeAgentOptions(
                model="claude-haiku-4-5",
                system_prompt="你是一个专业的技术文档翻译器。将英文MCP工具描述翻译成简洁准确的中文。只输出翻译结果，不要任何解释或前言。",
                max_turns=1,
            )
        )

        async with client:
            await client.query(prompt)

            response_text = ""
            async for msg in client.receive_response():
                msg_type = type(msg).__name__
                if msg_type == "AssistantMessage" and hasattr(msg, "content"):
                    for block in msg.content:
                        block_type = type(block).__name__
                        if block_type == "TextBlock" and hasattr(block, "text"):
                            response_text += block.text

            if response_text:
                print(response_text.strip())
                sys.exit(0)

        sys.exit(1)

    except ImportError as e:
        print(f"Import error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

asyncio.run(translate())
`;
  }

  /**
   * Clear the translation cache
   */
  clearCache(): void {
    this.cache = {};
    this.saveCache();
    debug('Translation cache cleared');
  }
}

// Export singleton instance
export const toolDescriptionTranslator = new ToolDescriptionTranslator();
