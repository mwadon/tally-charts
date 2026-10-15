import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heatmap, TONES } from 'tally-charts'

// Every tone's sequential ramp as a one-row heatmap with its legend: five cells, one per level,
// so the contrast rules of spec §6 can be checked in the browser in both themes.
const cells = TONES.flatMap((tone) =>
  [1, 2, 3, 4, 5].map((level) => ({ tone, level: `Level ${level}`, value: level })),
)

function Sequential() {
  return (
    <article className="card" style={{ display: 'grid', gap: 24 }}>
      {TONES.map((tone) => (
        <Heatmap
          key={tone}
          title={`Sequential ramp, ${tone}`}
          data={cells.filter((c) => c.tone === tone)}
          row="tone"
          column="level"
          value="value"
          breaks={[1.5, 2.5, 3.5, 4.5]}
          binLabels={['1', '2', '3', '4', '5']}
          tone={tone}
          totals={false}
        />
      ))}
    </article>
  )
}

const meta = {
  title: 'Primitives/Sequential',
  component: Sequential,
} satisfies Meta<typeof Sequential>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
