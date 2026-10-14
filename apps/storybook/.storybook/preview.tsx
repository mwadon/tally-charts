import type { Preview } from '@storybook/react-vite'
import 'tally-charts/theme.css'
import './preview.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, { globals, parameters }) => (
      <div className="sb-canvas" data-ch-theme={parameters.theme ?? globals.theme}>
        <Story />
      </div>
    ),
  ],
}

export default preview
