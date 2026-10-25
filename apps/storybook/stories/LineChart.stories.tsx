import type { Meta, StoryObj } from '@storybook/react-vite'
import { Area, LineChart } from 'tally-charts'

// An <Area> in LineChart's `underlay`: drawn above the grid and under the line. Area needs a band
// or time scale, so the chart uses a time axis. The data is computed, not random, so the
// screenshots are stable.
type Reading = { at: Date; value: number }

// Weekly readings from January to June 2026: a steady climb with a swing on top.
const data = Array.from(
  { length: 26 },
  (_, w): Reading => ({
    at: new Date(Date.UTC(2026, 0, 5 + w * 7)),
    value: Math.round(30 + w * 1.2 + 8 * Math.sin((w / 13) * 2 * Math.PI)),
  }),
)
const first = data[0] as Reading
const last = data[data.length - 1] as Reading

function Underlay() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Active accounts</h2>
        <span className="card-meta">Weekly, January to June 2026</span>
      </header>
      <LineChart<Reading>
        title="Active accounts"
        description={`Active accounts grow from ${first.value} in early January to ${last.value} in late June.`}
        data={data}
        x={{ type: 'time', field: 'at' }}
        series={[{ id: 'value', label: 'Active accounts', value: 'value' }]}
        underlay={<Area<Reading> data={data} x="at" y="value" />}
        yAxis={4}
        height={240}
        radius={0}
      />
    </article>
  )
}

const meta = { title: 'Charts/LineChart', component: Underlay } satisfies Meta<typeof Underlay>

export default meta
type Story = StoryObj<typeof meta>

export const UnderlayLight: Story = { parameters: { theme: 'light' } }
export const UnderlayDark: Story = { parameters: { theme: 'dark' } }
