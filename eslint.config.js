import js from '@eslint/js';

// Scope bewusst eng: nur echte .js/.mjs-Module (src/, scripts/), nicht das
// riesige Inline-<script> in saufapp.html. Das Inline-Script ist Legacy aus
// der schnellen AI-gestuetzten Prototyping-Phase und noch nicht linter-tauglich
// (kein Modul, globale Funktionen/State ueberall). Es zu linten ist ein Punkt
// fuer INFRASTRUCTURE.md (Frontend-Foundations), nicht etwas, das man "schnell
// mal" in Phase 4 anschaltet, ohne die Treffer einzeln zu bewerten.
export default [
  {
    ignores: ['www/**', 'node_modules/**', 'ios/**', 'assets/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Absichtlich ignorierte Fehler sind ein etabliertes Muster in diesem Projekt
      // (z.B. "best effort"-Storage/Plugin-Aufrufe, siehe AppDelegate.swift-Kommentar).
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
