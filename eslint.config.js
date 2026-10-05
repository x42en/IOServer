import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        // tsconfig.json only includes `src/**/*`, so the type-aware parser
        // could not resolve the tests or the examples. This dedicated project
        // extends it and widens `include` without touching the build config.
        project: ['./tsconfig.eslint.json'],
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'writable',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'examples/**/*.ts'],
    languageOptions: {
      globals: {
        // Ambient Node runtime globals. These files are executed as CommonJS by
        // ts-jest (tests) and ts-node (examples), so the CommonJS module wrapper
        // and the timer functions come from the host runtime, not from an import.
        require: 'readonly',
        module: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // scripts/gpr*.js are CommonJS entry points invoked by publish.yml as
        // `node scripts/gpr*.js`, so they need the CommonJS + Node globals that
        // the TypeScript block above only provides to .ts files.
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    files: ['docs-site/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        // docs-site is a separate, private Nuxt package (ioserver-docs@1.0.0)
        // that ships no tsconfig.json at all, so it gets its own lint-only one.
        project: ['./docs-site/tsconfig.eslint.json'],
      },
      globals: {
        // Nuxt auto-imports, available without an import in every source file.
        defineNuxtConfig: 'readonly',
        defineAppConfig: 'readonly',
        defineEventHandler: 'readonly',
      },
    },
  },
  {
    files: ['examples/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.js',
      '*.mjs',
      '.github/**',
      'coverage/**',
      // Generated TypeDoc output (`pnpm docs:api` writes here per typedoc.json).
      // Already listed in .gitignore:48, but still tracked in this repository.
      'docs/source/_static/api/**',
    ],
  },
];
