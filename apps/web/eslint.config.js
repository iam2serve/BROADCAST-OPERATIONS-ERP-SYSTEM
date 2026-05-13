import config from '@broadcast/eslint-config';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  ...config,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
