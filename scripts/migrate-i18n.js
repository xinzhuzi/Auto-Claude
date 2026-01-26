#!/usr/bin/env node

/**
 * i18n Migration Script
 *
 * Migrates cc-wf-studio translations to Auto-Claude's i18n system
 *
 * Usage: node scripts/migrate-i18n.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CC_WF_STUDIO_PATH = '/Users/zhengbingjin/Project/Github/cc-wf-studio';
const AUTO_CLAUDE_PATH = '/Users/zhengbingjin/Project/Github/Auto-Claude';

const SOURCE_TRANSLATIONS = {
  en: path.join(CC_WF_STUDIO_PATH, 'src/webview/src/i18n/translations/en.ts'),
  'zh-CN': path.join(CC_WF_STUDIO_PATH, 'src/webview/src/i18n/translations/zh-CN.ts'),
  ja: path.join(CC_WF_STUDIO_PATH, 'src/webview/src/i18n/translations/ja.ts'),
  ko: path.join(CC_WF_STUDIO_PATH, 'src/webview/src/i18n/translations/ko.ts'),
  'zh-TW': path.join(CC_WF_STUDIO_PATH, 'src/webview/src/i18n/translations/zh-TW.ts'),
};

const TARGET_TRANSLATIONS = {
  en: path.join(AUTO_CLAUDE_PATH, 'apps/frontend/src/shared/i18n/locales/en/workflowStudio.json'),
  'zh-CN': path.join(AUTO_CLAUDE_PATH, 'apps/frontend/src/shared/i18n/locales/zh-CN/workflowStudio.json'),
  fr: path.join(AUTO_CLAUDE_PATH, 'apps/frontend/src/shared/i18n/locales/fr/workflowStudio.json'),
};

const ARCHIVE_PATH = path.join(AUTO_CLAUDE_PATH, 'docs/i18n-archive');

// Exclusion patterns
const EXCLUDE_PATTERNS = [
  /^copilot\./,
  /^slack\./,
  /copilot/i,
  /slack/i,
];

/**
 * Parse TypeScript translation file
 */
function parseTypeScriptTranslations(filePath) {
  console.log(`\n📖 Reading: ${path.basename(filePath)}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const translations = {};

  // Extract translation object
  const objectMatch = content.match(/export const \w+: \w+ = \{([\s\S]*)\};/);
  if (!objectMatch) {
    throw new Error(`Failed to parse translations from ${filePath}`);
  }

  const objectContent = objectMatch[1];

  // Parse key-value pairs
  // Matches: 'key': 'value' or "key": "value" or key: 'value'
  const keyValueRegex = /['"]?([a-zA-Z0-9._-]+)['"]?\s*:\s*['"`]((?:[^'"`\\]|\\.)*)['"`]/g;

  let match;
  let count = 0;
  while ((match = keyValueRegex.exec(objectContent)) !== null) {
    const key = match[1];
    let value = match[2];

    // Unescape special characters
    value = value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    translations[key] = value;
    count++;
  }

  console.log(`   ✓ Parsed ${count} keys`);
  return translations;
}

/**
 * Filter out excluded keys
 */
function filterKeys(translations) {
  const filtered = {};
  let excludedCount = 0;

  for (const [key, value] of Object.entries(translations)) {
    const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(key));

    if (!shouldExclude) {
      filtered[key] = value;
    } else {
      excludedCount++;
    }
  }

  console.log(`   ✓ Filtered out ${excludedCount} keys (Copilot/Slack)`);
  console.log(`   ✓ Remaining: ${Object.keys(filtered).length} keys`);

  return filtered;
}

/**
 * Convert interpolation syntax: {var} → {{var}}
 */
function convertInterpolationSyntax(text) {
  // Convert {variable} to {{variable}}
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, '{{$1}}');
}

/**
 * Convert dot notation to nested object
 */
function convertDotNotationToNested(flatObj) {
  const nested = {};

  // Sort keys by depth to handle conflicts
  const sortedKeys = Object.keys(flatObj).sort((a, b) => {
    return a.split('.').length - b.split('.').length;
  });

  for (const key of sortedKeys) {
    const value = flatObj[key];
    const parts = key.split('.');
    let current = nested;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      // If current[part] exists and is not an object, skip this key
      if (current[part] !== undefined && typeof current[part] !== 'object') {
        console.warn(`   ⚠️  Skipping key "${key}" - conflicts with existing value at "${parts.slice(0, i + 1).join('.')}"`);
        break;
      }

      if (!current[part]) {
        current[part] = {};
      }
rent = current[part];
    }

    const lastPart = parts[parts.length - 1];

    // Only set if we successfully navigated to the right place
    if (current && typeof current === 'object') {
      current[lastPart] = convertInterpolationSyntax(value);
    }
  }

  return nested;
}

/**
 * Write JSON translations
 */
function writeJsonTranslations(targetPath, translations) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const json = JSON.stringify(translations, null, 2);
  fs.writeFileSync(targetPath, json + '\n', 'utf-8');

  console.log(`   ✓ Written to: ${path.basename(targetPath)}`);
}

/**
 * Archive translations for future use
 */
function archiveTranslations(language, translations) {
  const archiveDir = path.join(ARCHIVE_PATH, language);
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const archivePath = path.join(archiveDir, 'workflowStudio.json');
  const nested = convertDotNotationToNested(translations);
  writeJsonTranslations(archivePath, nested);

  console.log(`   ✓ Archived to: docs/i18n-archive/${language}/workflowStudio.json`);
}

/**
 * Create archive README
 */
function createArchiveReadme() {
  const readmePath = path.join(ARCHIVE_PATH, 'README.md');
  const content = `# Archived i18n Translations

This directory contains archived translations from cc-wf-studio that are not currently used in Auto-Claude.

## Available Languages

- **Japanese (ja)** - 日本語
- **Korean (ko)** - 한국어
- **Traditional Chinese (zh-TW)** - 繁體中文

## How to Restore a Language

To add support for one of these languages:

1. Copy the language directory to \`apps/frontend/src/shared/i18n/locales/\`
2. Update \`apps/frontend/src/shared/constants/i18n.ts\`:
   - Add the language to \`SupportedLanguage\` type
   - Add the language to \`AVAILABLE_LANGUAGES\` array
3. Update \`apps/frontend/src/shared/i18n/index.ts\`:
   - Import the workflowStudio translations for the language
   - Add to the \`resources\` object
4. Test the language in the application

## Translation Statistics

Each language contains approximately 656 keys for the workflow studio interface.

## Last Updated

${new Date().toISOString().split('T')[0]}
`;

  fs.writeFileSync(readmePath, content, 'utf-8');
  console.log(`\n📝 Created archive README`);
}

/**
 * Generate migration report
 */
function generateReport(stats) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60));

  console.log('\n✅ Migrated Languages:');
  for (const [lang, count] of Object.entries(stats.migrated)) {
    console.log(`   - ${lang}: ${count} keys`);
  }

  console.log('\n📦 Archived Languages:');
  for (const [lang, count] of Object.entries(stats.archived)) {
    console.log(`   - ${lang}: ${count} keys`);
  }

  console.log('\n🚫 Excluded Keys:');
  console.log(`   - Copilot/Slack: ~${stats.excluded} keys`);

  console.log('\n📁 Output Files:');
  console.log('   Migrated:');
  for (const lang of Object.keys(stats.migrated)) {
    console.log(`   - apps/frontend/src/shared/i18n/locales/${lang}/workflowStudio.json`);
  }
  console.log('   Archived:');
  for (const lang of Object.keys(stats.archived)) {
    console.log(`   - docs/i18n-archive/${lang}/workflowStudio.json`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Migration completed successfully!');
  console.log('='.repeat(60) + '\n');
}

/**
 * Main migration function
 */
function migrate() {
  console.log('\n🚀 Starting i18n migration...\n');

  const stats = {
    migrated: {},
    archived: {},
    excluded: 0,
  };

  // Process English (en)
  console.log('📦 Processing English (en)...');
  const enTranslations = parseTypeScriptTranslations(SOURCE_TRANSLATIONS.en);
  const enFiltered = filterKeys(enTranslations);
  stats.excluded = Object.keys(enTranslations).length - Object.keys(enFiltered).length;
  const enNested = convertDotNotationToNested(enFiltered);
  writeJsonTranslations(TARGET_TRANSLATIONS.en, enNested);
  stats.migrated.en = Object.keys(enFiltered).length;

  // Process Simplified Chinese (zh-CN)
  console.log('\n📦 Processing Simplified Chinese (zh-CN)...');
  const zhCNTranslations = parseTypeScriptTranslations(SOURCE_TRANSLATIONS['zh-CN']);
  const zhCNFiltered = filterKeys(zhCNTranslations);
  const zhCNNested = convertDotNotationToNested(zhCNFiltered);
  writeJsonTranslations(TARGET_TRANSLATIONS['zh-CN'], zhCNNested);
  stats.migrated['zh-CN'] = Object.keys(zhCNFiltered).length;

  // Process French (fr) - use English as base
  console.log('\n📦 Processing French (fr)...');
  console.log('   ℹ️  Using English translations as base (fallback to English)');
  writeJsonTranslations(TARGET_TRANSLATIONS.fr, enNested);
  stats.migrated.fr = Object.keys(enFiltered).length;

  // Archive Japanese (ja)
  console.log('\n📦 Archiving Japanese (ja)...');
  const jaTranslations = parseTypeScriptTranslations(SOURCE_TRANSLATIONS.ja);
  const jaFiltered = filterKeys(jaTranslations);
  archiveTranslations('ja', jaFiltered);
  stats.archived.ja = Object.keys(jaFiltered).length;

  // Archive Korean (ko)
  console.log('\n📦 Archiving Korean (ko)...');
  const koTranslations = parseTypeScriptTranslations(SOURCE_TRANSLATIONS.ko);
  const koFiltered = filterKeys(koTranslations);
  archiveTranslations('ko', koFiltered);
  stats.archived.ko = Object.keys(koFiltered).length;

  // Archive Traditional Chinese (zh-TW)
  console.log('\n📦 Archiving Traditional Chinese (zh-TW)...');
  const zhTWTranslations = parseTypeScriptTranslations(SOURCE_TRANSLATIONS['zh-TW']);
  const zhTWFiltered = filterKeys(zhTWTranslations);
  archiveTranslations('zh-TW', zhTWFiltered);
  stats.archived['zh-TW'] = Object.keys(zhTWFiltered).length;

  // Create archive README
  createArchiveReadme();

  // Generate report
  generateReport(stats);
}

// Run migration
try {
  migrate();
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
