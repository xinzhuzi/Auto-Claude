#!/usr/bin/env node
/**
 * i18n Translation Key Checker
 * 检查翻译文件的完整性和一致性
 *
 * 用法:
 *   node scripts/i18n-check.js              # 检查所有
 *   node scripts/i18n-check.js --namespace  # 指定命名空间
 *   node scripts/i18n-check.js --fix       # 自动修复（待实现）
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = 'apps/frontend/src/shared/i18n/locales';
const NAMESPACES = [
  'common', 'navigation', 'settings', 'tasks',
  'welcome', 'onboarding', 'dialogs', 'gitlab',
  'taskReview', 'terminal', 'errors', 'workflowStudio'
];
const LANGUAGES = ['en', 'fr', 'zh-CN'];

/**
 * 递归获取对象的所有键路径
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // 递归处理嵌套对象
      keys.push(...getAllKeys(value, fullKey));
    } else if (value === null || typeof value !== 'object') {
      // 只添加叶子节点的键
      keys.push(fullKey);
    } else if (Array.isArray(value)) {
      // 处理数组
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * 获取对象的所有键（包括非叶子节点）
 */
function getAllKeysIncludingNested(obj, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeysIncludingNested(value, fullKey));
    }
  }

  return keys;
}

/**
 * 检查单个命名空间的翻译
 */
function checkNamespace(ns) {
  const results = {
    namespace: ns,
    languages: {},
    issues: []
  };

  // 读取各语言的翻译文件
  const translations = {};
  for (const lang of LANGUAGES) {
    const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`);

    if (!fs.existsSync(filePath)) {
      results.issues.push({
        type: 'error',
        message: `文件不存在: ${filePath}`
      });
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      translations[lang] = JSON.parse(content);
      results.languages[lang] = {
        keys: getAllKeys(translations[lang]),
        allKeys: getAllKeysIncludingNested(translations[lang]),
        keyCount: 0,
        allKeyCount: 0
      };
      results.languages[lang].keyCount = results.languages[lang].keys.length;
      results.languages[lang].allKeyCount = results.languages[lang].allKeys.length;
    } catch (error) {
      results.issues.push({
        type: 'error',
        message: `JSON 解析失败: ${filePath} - ${error.message}`
      });
    }
  }

  // 以英文为基准对比
  if (translations.en) {
    const enKeys = new Set(results.languages.en.allKeys);

    for (const lang of LANGUAGES) {
      if (lang === 'en' || !results.languages[lang]) continue;

      const langKeys = new Set(results.languages[lang].allKeys);

      // 检查缺失的键
      const missing = [...enKeys].filter(k => !langKeys.has(k));
      if (missing.length > 0) {
        results.issues.push({
          type: 'missing',
          language: lang,
          count: missing.length,
          keys: missing.slice(0, 10) // 只显示前10个
        });
      }

      // 检查多余的键
      const extra = [...langKeys].filter(k => !enKeys.has(k));
      if (extra.length > 0) {
        results.issues.push({
          type: 'extra',
          language: lang,
          count: extra.length,
          keys: extra.slice(0, 10)
        });
      }
    }
  }

  return results;
}

/**
 * 检查硬编码的中文字符串
 */
function checkHardcodedChinese() {
  const componentsDir = 'apps/cc-wf-studio/src/components';
  const results = [];

  if (!fs.existsSync(componentsDir)) {
    return results;
  }

  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        // 匹配中文字符（包括字符串中的中文）
        const chinesePattern = /['"`][^'"`]*[\u4e00-\u9fff][^'"`]*['"`]/g;
        const commentsPattern = /\/\/.*[\u4e00-\u9fff]/g;

        lines.forEach((line, index) => {
          // 跳过注释行
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return;
          }

          const matches = line.match(chinesePattern);
          if (matches) {
            results.push({
              file: fullPath.replace(process.cwd() + '/', ''),
              line: index + 1,
              text: matches.join(', ')
            });
          }
        });
      }
    }
  }

  scanDirectory(componentsDir);
  return results;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 Auto-Claude i18n 翻译检查工具\n');

  let hasErrors = false;
  let hasWarnings = false;

  // 检查命名空间翻译
  console.log('📁 检查翻译文件...\n');

  const allResults = [];
  for (const ns of NAMESPACES) {
    const result = checkNamespace(ns);
    allResults.push(result);

    // 显示结果
    if (result.issues.length === 0) {
      console.log(`✅ ${ns.padEnd(20)} - 正常`);
    } else {
      hasErrors = true;
      console.log(`❌ ${ns.padEnd(20)} - 发现 ${result.issues.length} 个问题`);

      result.issues.forEach(issue => {
        if (issue.type === 'error') {
          console.log(`   错误: ${issue.message}`);
        } else if (issue.type === 'missing') {
          console.log(`   缺失 [${issue.language}]: ${issue.count} 个键`);
          issue.keys.forEach(k => console.log(`     - ${k}`));
        } else if (issue.type === 'extra') {
          console.log(`   多余 [${issue.language}]: ${issue.count} 个键`);
          issue.keys.forEach(k => console.log(`     - ${k}`));
        }
      });
    }

    // 显示键数量
    if (result.languages.en) {
      const enCount = result.languages.en.keyCount;
      const zhCount = result.languages['zh-CN']?.keyCount || 0;
      console.log(`   键数: EN=${enCount}, ZH-CN=${zhCount}`);
    }
  }

  // 检查硬编码中文
  console.log('\n🔍 检查硬编码中文字符串...\n');

  const hardcoded = checkHardcodedChinese();
  if (hardcoded.length === 0) {
    console.log('✅ 未发现硬编码中文字符串');
  } else {
    hasWarnings = true;
    console.log(`⚠️  发现 ${hardcoded.length} 处硬编码中文:\n`);

    hardcoded.slice(0, 20).forEach(item => {
      console.log(`   ${item.file}:${item.line}`);
      console.log(`     ${item.text.substring(0, 60)}...`);
    });

    if (hardcoded.length > 20) {
      console.log(`   ... 还有 ${hardcoded.length - 20} 处\n`);
    }
  }

  // 生成汇总报告
  console.log('\n📊 汇总报告\n' + '='.repeat(50));

  let totalEnKeys = 0;
  let totalZhKeys = 0;

  allResults.forEach(result => {
    if (result.languages.en) {
      totalEnKeys += result.languages.en.keyCount;
      totalZhKeys += result.languages['zh-CN']?.keyCount || 0;
    }
  });

  console.log(`总翻译键数:`);
  console.log(`  英文 (EN):     ${totalEnKeys}`);
  console.log(`  简体中文 (ZH): ${totalZhKeys}`);
  console.log(`  完成度:        ${totalZhKeys}/${totalEnKeys} (${Math.round(totalZhKeys / totalEnKeys * 100)}%)`);

  // 返回退出码
  if (hasErrors) {
    console.log('\n❌ 检查失败！请修复上述问题。\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️  检查完成，但有警告。\n');
    process.exit(0);
  } else {
    console.log('\n✅ 所有检查通过！\n');
    process.exit(0);
  }
}

// 运行
main();
