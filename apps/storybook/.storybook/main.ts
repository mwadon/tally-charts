import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const src = fileURLToPath(new URL('../../../packages/tally-charts/src', import.meta.url))

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.tsx'],
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        // Stories run against library source so edits show up without a build.
        alias: [
          { find: /^tally-charts\/theme\.css$/, replacement: `${src}/theme/theme.css` },
          { find: /^tally-charts\/core$/, replacement: `${src}/core/index.ts` },
          { find: /^tally-charts$/, replacement: `${src}/index.ts` },
        ],
      },
    }),
}

export default config
