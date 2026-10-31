import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Axis,
  BarChart,
  type BarChartProps,
  Bars,
  Chart,
  Grid,
  Target,
  Tooltip,
} from 'tally-charts'

// The "Last 12 weeks" card from docs/reference/01-gross-margin-waterfall.png, as one component.
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

type Week = (typeof weeks)[number]

function TwelveWeeks({
  orientation = 'vertical',
  tone,
}: {
  orientation?: 'vertical' | 'horizontal'
  tone?: BarChartProps<Week>['tone']
}) {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Last 12 weeks</h2>
        <span className="card-meta">Margin by week</span>
      </header>
      <BarChart
        data={weeks}
        x="week"
        y="margin"
        orientation={orientation}
        tone={tone}
        domain={[26, 40]}
        target={{ value: 38, label: 'Target 38%' }}
        height={orientation === 'vertical' ? 260 : undefined}
        format="percent"
        valueFormat={(v) => v.toFixed(1)}
        title="Margin by week, last 12 weeks"
        description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
      />
    </article>
  )
}

const meta = { title: 'Charts/BarChart', component: TwelveWeeks } satisfies Meta<typeof TwelveWeeks>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
export const Horizontal: Story = { args: { orientation: 'horizontal' } }

// Opt-in `data-ch-palette="vivid"`: the pre-0.6b warn, gain and neutral, on a light surface.
export const Vivid: Story = {
  args: {
    tone: (d: Week) => (d.margin >= 37 ? 'gain' : d.margin < 34 ? 'warn' : 'neutral'),
  },
  parameters: { theme: 'light', palette: 'vivid' },
}

const scores = [
  { range: '0–9', students: 1 },
  { range: '10–19', students: 2 },
  { range: '20–29', students: 4 },
  { range: '30–39', students: 7 },
  { range: '40–49', students: 11 },
  { range: '50–59', students: 16 },
  { range: '60–69', students: 19 },
  { range: '70–79', students: 14 },
  { range: '80–89', students: 8 },
  { range: '90–99', students: 3 },
]

// A threshold of 73 inside the "70–79" bucket: position 0.3 of the category's step.
export const ThresholdInBucket: Story = {
  render: () => (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Scores by bucket</h2>
        <span className="card-meta">Pass mark 73</span>
      </header>
      <Chart
        data={scores}
        x={{ type: 'band', field: 'range', padding: 0.2 }}
        y={{ field: 'students' }}
        margin={{ left: 36 }}
        height={240}
        title="Scores by bucket, with a pass mark at 73"
        description="Most students scored between 50 and 79. The pass mark of 73 falls inside the 70 to 79 bucket."
      >
        <Grid ticks={4} />
        <Bars id="range" />
        <Target x="70–79" position={0.3} label="Pass mark 73" />
        <Axis side="left" ticks={4} />
        <Axis side="bottom" />
        <Tooltip />
      </Chart>
    </article>
  ),
  parameters: { theme: 'light' },
}
