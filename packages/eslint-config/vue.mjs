import base from './base.mjs';
import vue from 'eslint-plugin-vue';

export default [
  ...base,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    rules: {
      'vue/component-api-style': ['error', ['script-options']],
      'vue/block-lang': ['error', { script: { lang: ['ts'] } }]
    }
  }
];