import { GroupedBarChart, Legend } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'grouped-bar-chart/with-legend',
  title: 'Tickets closed by team, per month',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { month: 'Jul', billing: 64, platform: 48, support: 90 },
  { month: 'Aug', billing: 58, platform: 61, support: 84 },
  { month: 'Sep', billing: 71, platform: 55, support: 97 },
]

// The chart has no legend of its own: compose `Legend` with the same tones.
export default function WithLegend() {
  return (
    <div>
      <Legend
        items={[
          { label: 'Billing', tone: 'accent' },
          { label: 'Platform', tone: 'accent-soft' },
          { label: 'Support', tone: 'warn' },
        ]}
      />
      <GroupedBarChart
        data={months}
        x="month"
        series={[
          { id: 'billing', label: 'Billing', value: 'billing' },
          { id: 'platform', label: 'Platform', value: 'platform' },
          { id: 'support', label: 'Support', value: 'support' },
        ]}
        domain={[0, 120]}
        height={260}
        title={meta.title}
        description="Support closed the most tickets every month. Platform closed the fewest in July and September."
      />
    </div>
  )
}
