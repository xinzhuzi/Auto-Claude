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
