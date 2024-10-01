// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['src/**/*.ts'],
  languageOptions: {
    parserOptions: {
      parser: "@typescript-eslint/parser",
      project: "./tsconfig.json",
    },
  },
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  
  rules: {
    '@typescript-eslint/no-explicit-any': ['error', {
        ignoreRestArgs: true,
    }],
  },
})