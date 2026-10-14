import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend } from 'tally-charts'

// Legends from docs/reference/03-estimate-vs-actual.png and 02-jobs-dot-histogram-table.png.
function Legends() {
  return (
    <div className="card" style={{ display: 'grid', gap: 20 }}>
      <Legend
        items={[
          { label: 'Estimate', tone: 'accent', fill: 'hatch' },
          { label: 'Actual', tone: 'accent' },
          { label: 'Over estimate', tone: 'loss', fill: 'hatch' },
        ]}
      />
      <Legend
        shape="dot"
        items={[
          { label: 'Critical', tone: 'loss', count: 6 },
          { label: 'At risk', tone: 'warn', count: 16 },
          { label: 'Below target', tone: 'accent-soft', count: 42 },
          { label: 'On target', tone: 'gain', count: 94 },
        ]}
      />
    </div>
  )
}

const meta = { title: 'Primitives/Legend', component: Legends } satisfies Meta<typeof Legends>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
