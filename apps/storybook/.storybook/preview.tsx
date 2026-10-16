import type { Preview } from '@storybook/react-vite'
import 'tally-charts/theme.css'
import './preview.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
    palette: {
      description: 'Color palette',
      toolbar: {
        title: 'Palette',
        icon: 'paintbrush',
        items: ['default', 'vivid'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', palette: 'default' },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, { globals, parameters }) => {
      const palette = parameters.palette ?? globals.palette
      return (
        <div
          className="sb-canvas"
          data-ch-theme={parameters.theme ?? globals.theme}
          data-ch-palette={palette === 'vivid' ? 'vivid' : undefined}
        >
          <Story />
        </div>
      )
    },
  ],
}

export default preview
