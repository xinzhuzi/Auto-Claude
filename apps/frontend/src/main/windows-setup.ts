/**
 * Windows First-Run Setup for pywin32
 *
 * This module handles automatic installation of pywin32 on Windows when the app
 * is first launched. pywin32 requires a post-install script to register COM components
 * and copy DLLs to system directories. This script runs that setup automatically.
 *
 * The setup is performed only once and marked complete with a flag file.
 */

import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Flag file to indicate pywin32 setup has been completed */
const PYWIN32_SETUP_FLAG = 'pywin32-setup-complete';

/**
 * Get the path to the flag file that tracks whether pywin32 setup is complete.
 */
function getSetupFlagPath(): string {
  const userData = app.getPath('userData');
  return join(userData, PYWIN32_SETUP_FLAG);
}

/**
 * Check if pywin32 setup has already been completed.
 */
function isSetupComplete(): boolean {
  const flagPath = getSetupFlagPath();
  return existsSync(flagPath);
}

/**
 * Mark pywin32 setup as complete by creating the flag file.
 */
function markSetupComplete(): void {
  const flagPath = getSetupFlagPath();
  try {
    writeFileSync(flagPath, new Date().toISOString(), 'utf-8');
    console.log('[windows-setup] pywin32 setup marked as complete');
  } catch (error) {
    console.warn('[windows-setup] Failed to write setup flag:', error);
  }
}

/**
 * Find the bundled Python directory in the packaged app.
 */
function findBundledPython(): string | null {
  // In production, Python is bundled in resources/python
  // In development, it's in python-runtime/win32-x64/python
  const possiblePaths = [
    join(process.resourcesPath, 'python'),           // Production
    join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'python'),  // Production (asar unpacked)
    join(__dirname, '../../python-runtime/win-x64/python'),  // Development
  ];

  for (const pythonPath of possiblePaths) {
    if (existsSync(pythonPath)) {
      const pythonExe = join(pythonPath, 'python.exe');
      if (existsSync(pythonExe)) {
        console.log(`[windows-setup] Found bundled Python at: ${pythonPath}`);
        return pythonPath;
      }
    }
  }

  console.warn('[windows-setup] Bundled Python not found');
  return null;
}

/**
 * Test if pywin32 is already working by trying to import win32api.
 */
function testPywin32(pythonDir: string): boolean {
  const pythonExe = join(pythonDir, 'python.exe');

  try {
    const result = spawnSync(pythonExe, ['-c', 'import win32api; print("OK")'], {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (result.stdout && result.stdout.includes('OK')) {
      console.log('[windows-setup] pywin32 is already working');
      return true;
    }
  } catch (error) {
    console.warn('[windows-setup] Failed to test pywin32:', error);
  }

  return false;
}

/**
 * Find the pywin32 post-install script.
 * In modern pywin32 (311+), it's a Python script, not an exe.
 */
function findPywin32Postinstall(pythonDir: string): string | null {
  // Try the modern location (Python script in site-packages)
  const modernScript = join(pythonDir, '..', 'site-packages', 'win32', 'scripts', 'pywin32_postinstall.py');
  if (existsSync(modernScript)) {
    return modernScript;
  }

  // Try the old location (exe in Scripts directory)
  const oldScript = join(pythonDir, 'Scripts', 'pywin32_postinstall.exe');
  if (existsSync(oldScript)) {
    return oldScript;
  }

  return null;
}

/**
 * Install pywin32 using pip if not already installed.
 */
function installPywin32(pythonDir: string): boolean {
  const pythonExe = join(pythonDir, 'python.exe');

  console.log('[windows-setup] Installing pywin32 using pip...');
  console.log('[windows-setup] This may take a minute...');

  try {
    const result = spawnSync(
      pythonExe,
      ['-m', 'pip', 'install', 'pywin32>=306', '--no-warn-script-location'],
      {
        stdio: 'pipe',
        cwd: pythonDir,
      }
    );

    if (result.status !== 0) {
      console.error('[windows-setup] Failed to install pywin32');
      if (result.stderr) {
        console.error(`[windows-setup] Error: ${result.stderr}`);
      }
      return false;
    }

    console.log('[windows-setup] ✓ pywin32 package installed');
    return true;
  } catch (error) {
    console.error('[windows-setup] Error installing pywin32:', error);
    return false;
  }
}

/**
 * Run the pywin32 post-install script.
 */
function runPywin32Postinstall(pythonDir: string): boolean {
  const pythonExe = join(pythonDir, 'python.exe');
  let postinstallScript = findPywin32Postinstall(pythonDir);

  // If post-install script not found, try installing pywin32 first
  if (!postinstallScript) {
    console.warn('[windows-setup] pywin32 post-install script not found');
    console.log('[windows-setup] Attempting to install pywin32...');

    if (!installPywin32(pythonDir)) {
      console.error('[windows-setup] Failed to install pywin32');
      return false;
    }

    // Try finding the post-install script again
    postinstallScript = findPywin32Postinstall(pythonDir);
    if (!postinstallScript) {
      console.error('[windows-setup] Still cannot find pywin32 post-install script after installation');
      return false;
    }
  }

  console.log('[windows-setup] Running pywin32 post-install script...');
  console.log(`[windows-setup] Script: ${postinstallScript}`);

  try {
    // Check if it's a Python script or exe
    const isPythonScript = postinstallScript.endsWith('.py');

    const result = spawnSync(
      isPythonScript ? pythonExe : postinstallScript,
      isPythonScript ? [postinstallScript, '-install'] : ['-install'],
      {
        stdio: 'inherit',
        cwd: pythonDir,
      }
    );

    if (result.status !== 0) {
      console.error(`[windows-setup] pywin32 post-install failed with exit code ${result.status}`);
      if (result.error) {
        console.error(`[windows-setup] Error: ${result.error.message}`);
      }
      return false;
    }

    // Verify installation worked
    console.log('[windows-setup] Verifying pywin32 installation...');
    const verifyResult = spawnSync(pythonExe, ['-c', 'import win32api; print("OK")'], {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (verifyResult.stdout && verifyResult.stdout.includes('OK')) {
      console.log('[windows-setup] ✓ pywin32 installed successfully!');
      return true;
    } else {
      console.warn('[windows-setup] Warning: pywin32 installation verification failed');
      return false;
    }
  } catch (error) {
    console.error('[windows-setup] Error running pywin32 post-install:', error);
    return false;
  }
}

/**
 * Main setup function - performs one-time Windows-specific setup.
 *
 * This function should be called early in the app startup process (after app.whenReady()).
 * It will:
 * 1. Check if setup has already been done
 * 2. If not, find the bundled Python
 * 3. Test if pywin32 is working
 * 4. If not working, run the post-install script
 * 5. Mark setup as complete
 *
 * Returns true if setup was successful or already completed, false if it failed.
 */
export function setupWindowsDeps(): boolean {
  // Only run on Windows
  if (process.platform !== 'win32') {
    console.log('[windows-setup] Not Windows, skipping...');
    return true;
  }

  console.log('[windows-setup] Starting Windows dependency setup...');

  // Check if already done
  if (isSetupComplete()) {
    console.log('[windows-setup] Setup already completed, skipping...');
    return true;
  }

  // Find bundled Python
  const pythonDir = findBundledPython();
  if (!pythonDir) {
    console.warn('[windows-setup] No bundled Python found, skipping pywin32 setup');
    // Don't mark as complete - we'll try again next time
    return false;
  }

  // Test if pywin32 is already working (maybe it was installed during packaging)
  if (testPywin32(pythonDir)) {
    console.log('[windows-setup] pywin32 is already working, marking setup complete');
    markSetupComplete();
    return true;
  }

  // Run pywin32 post-install script
  const success = runPywin32Postinstall(pythonDir);

  if (success) {
    markSetupComplete();
    console.log('[windows-setup] ✓ Windows dependency setup completed successfully!');
  } else {
    console.warn('[windows-setup] ⚠ Windows dependency setup failed');
    console.warn('[windows-setup] Some features may not work correctly');
    // Don't mark as complete - we'll try again next time
  }

  return success;
}

/**
 * Get information about the setup status (for debugging/settings display).
 */
export function getWindowsSetupInfo(): { complete: boolean; timestamp?: string } {
  const flagPath = getSetupFlagPath();
  
  if (!existsSync(flagPath)) {
    return { complete: false };
  }

  try {
    const timestamp = readFileSync(flagPath, 'utf-8');
    return { complete: true, timestamp };
  } catch {
    return { complete: true };
  }
}
