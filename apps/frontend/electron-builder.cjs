/**
 * Electron Builder Configuration
 *
 * Custom hooks for the build process.
 * This file is loaded by electron-builder automatically.
 *
 * Note: Windows-specific pywin32 setup is handled by:
 * 1. installer.nsh - NSIS post-install script (runs after user installs the app)
 * 2. src/main/windows-setup.ts - First-run setup (runs when app starts)
 *
 * No afterPack hook needed - pywin32 is installed on the user's machine, not during build.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * beforePack hook - 最后一道防线，确保不需要的文件不会被打入包体
   * 注意：主要优化已在 package-with-python.cjs 的 stageCodeServer 中完成
   */
  beforePack: async (context) => {
    const codeServerDir = path.join(context.appOutDir, '..', '..', 'code-server-staged', 'lib');
    const platform = context.electronPlatformName; // 'darwin', 'win32', 'linux'
    
    if (!fs.existsSync(codeServerDir)) {
      return;
    }
    
    console.log(`[beforePack] Verifying code-server for platform: ${platform}`);
    
    // Double-check: remove wrong platform's code-server if it somehow got included
    const entries = fs.readdirSync(codeServerDir);
    for (const entry of entries) {
      const entryPath = path.join(codeServerDir, entry);
      
      if (entry.includes('-win') && platform !== 'win32') {
        console.log(`[beforePack] Removing unexpected Windows code-server...`);
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else if (entry.match(/^code-server-[\d.]+$/) && platform === 'win32') {
        console.log(`[beforePack] Removing unexpected Mac/Linux code-server...`);
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
  },

  afterPack: async (context) => {
    // Only process macOS builds
    if (context.electronPlatformName !== 'darwin') {
      return;
    }

    const appPath = path.join(context.appOutDir, 'Info.plist');

    if (!fs.existsSync(appPath)) {
      console.warn(`Info.plist not found at ${appPath}`);
      return;
    }

    // Read the Info.plist file
    let plistContent = fs.readFileSync(appPath, 'utf8');

    // Check if LSEnvironment already exists
    const lsEnvRegex = /<key>LSEnvironment<\/key>\s*<dict>/;
    const lsEnvMatch = plistContent.match(lsEnvRegex);

    if (lsEnvMatch) {
      // LSEnvironment exists, add PATH to it
      plistContent = plistContent.replace(
        /(<key>LSEnvironment<\/key>\s*<dict>[\s\S]*?<\/dict>)/,
        (match) => {
          // Check if PATH already exists
          if (match.includes('<key>PATH</key>')) {
            return match; // Already has PATH, don't modify
          }
          // Insert PATH after the opening <dict>
          return match.replace(
            /(<key>LSEnvironment<\/key>\s*<dict>)/,
            '$1\n    <key>PATH</key>\n    <string>/usr/local/share/dotnet:/usr/share/dotnet:$HOME/.dotnet:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>'
          );
        }
      );
    } else {
      // LSEnvironment doesn't exist, insert it before the closing </dict> tag
      const insertBeforeClosing = /(<\/dict>\s*<\/plist>)/;
      const lsEnvBlock = `
    <key>LSEnvironment</key>
    <dict>
      <key>PATH</key>
      <string>/usr/local/share/dotnet:/usr/share/dotnet:$HOME/.dotnet:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>`;

      plistContent = plistContent.replace(insertBeforeClosing, lsEnvBlock + '\n$1');
    }

    // Write the modified Info.plist back
    fs.writeFileSync(appPath, plistContent, 'utf8');
    console.log('Updated Info.plist with dotnet PATH configuration');
  },
};
