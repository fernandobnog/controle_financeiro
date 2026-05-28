import base from './base.mjs';

export default [
  ...base,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      sourceType: 'module'
    },
    rules: {
      'no-console': 'off'
    }
  }
];