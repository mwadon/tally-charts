import type { Meta, StoryObj } from '@storybook/react-vite'
import { BarChart, type BarChartProps } from 'tally-charts'

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
