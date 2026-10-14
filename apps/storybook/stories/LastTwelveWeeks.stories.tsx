import type { Meta, StoryObj } from '@storybook/react-vite'
import { Axis, Bars, Chart, Target, Tooltip, ValueLabel } from 'tally-charts'

// Mirrors docs/reference/01-gross-margin-waterfall.png, card "Last 12 weeks".
const weeks = [
  { week: 'Jul 6', margin: 37.5 },
  { week: 'Jul 13', margin: 36.9 },
  { week: 'Jul 20', margin: 35.6 },
  { week: 'Jul 27', margin: 37.1 },
  { week: 'Aug 3', margin: 34.9 },
  { week: 'Aug 10', margin: 33.9 },
  { week: 'Aug 17', margin: 35.1 },
  { week: 'Aug 24', margin: 33.7 },
  { week: 'Aug 31', margin: 32.6 },
  { week: 'Sep 7', margin: 35.9 },
  { week: 'Sep 14', margin: 36.6 },
  { week: 'Sep 21', margin: 34.0 },
]

function LastTwelveWeeks() {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Last 12 weeks</h2>
        <span className="card-meta">Margin by week</span>
      </header>
      <Chart
        data={weeks}
        title="Margin by week, last 12 weeks"
        description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
        height={260}
        margin={{ top: 24, bottom: 28 }}
        x={{ type: 'band', field: 'week', padding: 0.35 }}
        y={{ field: 'margin', domain: [26, 40] }}
      >
        <Target y={38} label="Target 38%" />
        <Bars
          fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')}
          format="percent"
        />
        <ValueLabel at="last" format={(v) => v.toFixed(1)} />
        <Axis side="bottom" ticks="ends" />
        <Tooltip />
      </Chart>
    </article>
  )
}

const meta = {
  title: 'Reference/Last 12 weeks',
  component: LastTwelveWeeks,
} satisfies Meta<typeof LastTwelveWeeks>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
