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

type Position = { week: string; position: number }

// Average search position: 1 is best, so the domain runs from 10 down to 1 and the line climbs.
const positions: Position[] = [9.4, 8.8, 8.1, 7.2, 6.9, 5.6, 5.9, 4.3, 3.8, 3.1].map(
  (position, i) => ({ week: `W${i + 1}`, position }),
)

export const ReversedPosition: Story = {
  render: () => (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Average position</h2>
        <span className="card-meta">Weekly, 1 is best</span>
      </header>
      <LineChart<Position>
        title="Average search position by week"
        description="The page climbed from an average position of 9.4 in W1 to 3.1 in W10."
        data={positions}
        x="week"
        series={[{ id: 'position', label: 'Average position', value: 'position' }]}
        domain={[10, 1]}
        target={{ value: 3, label: 'Goal: top 3' }}
        format={{ preset: 'number', digits: 1 }}
        yAxis={5}
        height={240}
      />
    </article>
  ),
  parameters: { theme: 'light' },
}
