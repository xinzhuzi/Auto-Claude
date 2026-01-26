/**
 * VSCode Embed Component
 *
 * Uses code-server to embed full VSCode functionality.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { CodeServerAPI } from './codeServerApi';
import type { VSCodeEmbedProps } from './types';

/**
 * VSCode Embed Component
 *
 * Embeds a complete VSCode instance via code-server.
 */
export const VSCodeEmbed: React.FC<VSCodeEmbedProps> = ({
  projectPath,
  port,
  onLoad,
  onError
}) => {
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentPort, setCurrentPort] = useState<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const onErrorRef = useRef(onError);
  const onLoadRef = useRef(onLoad);

  // Keep refs in sync
  useEffect(() => {
    onErrorRef.current = onError;
    onLoadRef.current = onLoad;
  });

  // Clear all timers
  const clearTimers = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const startServer = async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);
        clearTimers();

        console.log('[VSCodeEmbed] Starting code-server for:', {
          projectPath,
          port,
          showLoading
        });

        const result = await CodeServerAPI.start(projectPath, port);

        if (!mounted) return;

        if (result.success && result.url) {
          console.log('[VSCodeEmbed] Server started:', result.url);
          console.log('[VSCodeEmbed] Setting webview src to:', result.url);
          setServerUrl(result.url);
          setCurrentPort(result.port || null);

          if (showLoading) {
            // Set a timeout to force show content after 30 seconds
            // Even if onDidFinishLoad doesn't fire
            loadingTimeoutRef.current = setTimeout(() => {
              if (!mounted) return;
              console.log('[VSCodeEmbed] Timeout reached (30s), forcing load complete');
              clearTimers();
              setIsLoading(false);
            }, 30000);

            // Also periodically check if webview is ready (every 2 seconds, not 1)
            // This reduces CPU usage and gives more time for webview to load
            checkIntervalRef.current = setInterval(() => {
              if (!mounted) {
                // Clear interval and null out ref to prevent memory leaks
                if (checkIntervalRef.current) {
                  clearInterval(checkIntervalRef.current);
                  checkIntervalRef.current = null;
                }
                return;
              }
              const webview = webviewRef.current;
              if (webview && webview.getURL()) {
                // Webview has URL loaded, consider it ready
                // This is a simple cross-platform check that works on all platforms
                console.log('[VSCodeEmbed] Webview has URL, considering loaded');
                clearTimers();
                setIsLoading(false);
              }
            }, 2000);
          } else {
            // Server already running, no need to show loading
            setIsLoading(false);
          }
        } else {
          console.error('[VSCodeEmbed] Failed to start:', result.error);
          setError(result.error || 'Failed to start code-server');
          setIsLoading(false);
          onErrorRef.current?.(new Error(result.error || 'Failed to start code-server'));
        }
      } catch (err) {
        if (!mounted) return;
        console.error('[VSCodeEmbed] Error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        setIsLoading(false);
        onErrorRef.current?.(err instanceof Error ? err : new Error(errorMsg));
      }
    };

    // Initialize: check if server is already running
    const initialize = async () => {
      try {
        console.log('[VSCodeEmbed] Checking if server is already running...');
        const info = await CodeServerAPI.getInfo(projectPath);

        if (info.running && info.url) {
          // Server already running, use it directly without loading animation
          console.log('[VSCodeEmbed] Server already running at:', info.url);
          setServerUrl(info.url);
          setCurrentPort(info.port || null);
          setIsLoading(false);
        } else {
          // Server not running, start it with loading animation
          console.log('[VSCodeEmbed] Server not running, starting...');
          await startServer(true);
        }
      } catch (err) {
        console.error('[VSCodeEmbed] Initialize error:', err);
        // Fallback: try to start server
        await startServer(true);
      }
    };

    initialize();

    return () => {
      mounted = false;
      clearTimers();
      // NOTE: Don't stop server on unmount to allow project switching without restart
      // The code-server service has process caching to handle this efficiently
      console.log('[VSCodeEmbed] Component unmounting, keeping server running for project:', projectPath);
    };
  }, [projectPath, port]); // Removed onError from dependencies

  // Add webview event listeners via ref
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const onDidFinishLoad = () => {
      handleLoad();
    };

    const onDidFailLoad = (event: any) => {
      handleWebviewError(event);
    };

    webview.addEventListener('did-finish-load', onDidFinishLoad);
    webview.addEventListener('did-fail-load', onDidFailLoad);

    return () => {
      webview.removeEventListener('did-finish-load', onDidFinishLoad);
      webview.removeEventListener('did-fail-load', onDidFailLoad);
    };
  }, [serverUrl]); // Re-attach when serverUrl changes

  /**
   * Webview load complete
   */
  const handleLoad = () => {
    console.log('[VSCodeEmbed] ✓ Webview loaded successfully');
    console.log('[VSCodeEmbed] Current serverUrl:', serverUrl);
    console.log('[VSCodeEmbed] Current port:', currentPort);
    clearTimers();
    setIsLoading(false);
    onLoadRef.current?.();
  };

  /**
   * Webview load failed
   */
  const handleWebviewError = (event: any) => {
    console.error('[VSCodeEmbed] ✗ Webview failed to load:', event);
    console.error('[VSCodeEmbed] Error code:', event.errorCode);
    console.error('[VSCodeEmbed] Error description:', event.errorDescription);
    console.error('[VSCodeEmbed] Validated URL:', event.validatedURL);
    setError('Failed to load VSCode interface');
    clearTimers();
    setIsLoading(false);
    onErrorRef.current?.(new Error('Webview load failed'));
  };

  /**
   * Retry starting server
   */
  const handleRetry = async () => {
    console.log('[VSCodeEmbed] Retry requested');
    setIsRetrying(true);
    setError(null);
    setIsLoading(true);

    try {
      // First check if server is already running (user might have manually restarted it)
      const info = await CodeServerAPI.getInfo(projectPath);

      if (info.running && info.url) {
        console.log('[VSCodeEmbed] Server recovered, using existing instance:', info.url);
        setServerUrl(info.url);
        setCurrentPort(info.port || null);
        setIsLoading(false);
        return;
      }

      // Server not running, start it
      console.log('[VSCodeEmbed] Server not running, starting...');
      const result = await CodeServerAPI.start(projectPath, port);

      if (result.success && result.url) {
        setServerUrl(result.url);
        setCurrentPort(result.port || null);
      } else {
        setError(result.error || 'Failed to start code-server');
        setIsLoading(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setIsLoading(false);
    } finally {
      setIsRetrying(false);
    }
  };

  /**
   * Refresh webview and restart server if needed
   */
  const handleRefresh = async () => {
    // Prevent multiple simultaneous refresh requests
    if (isLoading) {
      console.log('[VSCodeEmbed] Refresh already in progress, ignoring request');
      return;
    }

    console.log('[VSCodeEmbed] Refresh requested, ensuring correct project is loaded...');

    try {
      setIsLoading(true);
      setError(null);

      // Always restart the server to ensure it loads the correct project
      // This handles cases where:
      // 1. User switched project tabs but server is still running old project
      // 2. coder.json points to wrong project
      // 3. Server crashed but process cache thinks it's running
      console.log('[VSCodeEmbed] Restarting code-server to ensure correct project path...');

      const result = await CodeServerAPI.start(projectPath, port);

      if (result.success && result.url) {
        console.log('[VSCodeEmbed] Server restarted successfully:', result.url);
        setServerUrl(result.url);
        setCurrentPort(result.port || null);
        // Clear loading state after successful restart
        clearTimers();
        setIsLoading(false);
      } else {
        console.error('[VSCodeEmbed] Failed to restart server:', result.error);
        setError(result.error || 'Failed to restart code-server');
        setIsLoading(false);
        onErrorRef.current?.(new Error(result.error || 'Failed to restart code-server'));
      }
    } catch (err) {
      console.error('[VSCodeEmbed] Error during refresh:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setIsLoading(false);
      onErrorRef.current?.(err instanceof Error ? err : new Error(errorMsg));
    }
  };

  // Error state
  if (error) {
    return (
      <div className="h-full w-full bg-[#1E1E1E] flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Failed to Start VSCode
          </h3>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry'
              )}
            </button>
          </div>
          {currentPort && (
            <p className="text-xs text-gray-500 mt-4">
              Port: {currentPort}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !serverUrl) {
    return (
      <div className="h-full w-full bg-[#1E1E1E] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Starting VSCode...</p>
          <p className="text-xs text-gray-500 mt-2">
            This may take up to 30 seconds on first launch
          </p>
        </div>
      </div>
    );
  }

  // Normal state
  return (
    <div className="h-full w-full bg-[#1E1E1E] relative">
      {/* Toolbar */}
      <div className="absolute top-0 right-0 z-10 p-2">
        <button
          onClick={handleRefresh}
          className="p-2 bg-[#252526] hover:bg-[#3E3E42] rounded text-gray-400 hover:text-white transition-colors"
          title="Reconnect to VSCode (checks server status and restarts if needed)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Webview */}
      <webview
        ref={webviewRef}
        id="vscode-webview"
        src={serverUrl}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        partition="persist:vscode"
        // @ts-expect-error - Electron webview uses string "true"/"false" not boolean
        allowpopups="true"
        // Enable Node.js integration for file system access
        // @ts-expect-error - Electron webview uses string "true"/"false" not boolean
        nodeintegration="true"
        contextisolation="false"
        // @ts-expect-error - Electron webview uses string "true"/"false" not boolean
        disablewebsecurity="true"
        httpreferrer="http://127.0.0.1"
        // Additional permissions for file system access
        webpreferences="allowRunningInsecureContent=yes,javascript=yes"
      />
    </div>
  );
};
