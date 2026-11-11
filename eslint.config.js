import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src-tauri/target']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      // backend calls live in src/services
      'no-restricted-imports': ['error', { paths: [{ name: '@tauri-apps/api/core', message: 'Call the backend through src/services.' }] }],
    },
  },
  {
    files: ['src/services/**', 'src/components/debug/**', 'src/components/ui/TestOverlay.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
])
