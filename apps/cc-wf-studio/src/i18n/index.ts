/**
 * CC-WF-Studio i18n Configuration
 *
 * CC-WF-Studio 使用独立的翻译文件，但与 Auto-Claude 主应用共享同一个 i18next 实例。
 * 翻译文件位于: apps/cc-wf-studio/src/i18n/locales/
 *
 * 使用方式:
 *   import { useTranslation } from 'react-i18next';
 *   const { t } = useTranslation('ccwfstudio');
 */

// 导出翻译文件路径，供主应用 i18n 配置使用
export const CCWF_I18N_PATH = 'apps/cc-wf-studio/src/i18n/locales';

// 支持的语言列表
export const CCWF_SUPPORTED_LANGUAGES = [
  'en',      // English
  'fr',      // French
  'zh-CN',   // Chinese (Simplified)
  'ja',      // Japanese
  'ko',      // Korean
  'zh-TW',   // Chinese (Traditional)
] as const;

// 翻译命名空间
export const CCWF_NAMESPACE = 'ccwfstudio';

// 翻译文件名
export const CCWF_TRANSLATION_FILE = 'workflowStudio.json';
