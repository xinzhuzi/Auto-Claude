# Archived i18n Translations

This directory contains archived translations from cc-wf-studio that are not currently used in Auto-Claude.

## Available Languages

- **Japanese (ja)** - 日本語
- **Korean (ko)** - 한국어
- **Traditional Chinese (zh-TW)** - 繁體中文

## How to Restore a Language

To add support for one of these languages:

1. Copy the language directory to `apps/frontend/src/shared/i18n/locales/`
2. Update `apps/frontend/src/shared/constants/i18n.ts`:
   - Add the language to `SupportedLanguage` type
   - Add the language to `AVAILABLE_LANGUAGES` array
3. Update `apps/frontend/src/shared/i18n/index.ts`:
   - Import the workflowStudio translations for the language
   - Add to the `resources` object
4. Test the language in the application

## Translation Statistics

Each language contains approximately 656 keys for the workflow studio interface.

## Last Updated

2026-01-23
