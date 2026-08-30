import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['coverage/**', 'dist/**', 'eslint.config.mjs', 'node_modules/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['test/setup-angular.ts', 'vitest.config.ts']
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off'
    }
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off'
    }
  }
);
