import { DonutChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'donut-chart/many-parts',
  title: 'Hours logged by trade',
  rscSafe: true,
} satisfies ExampleMeta

// Nine trades in no particular order; the chart sorts them, largest first.
const trades = [
  { trade: 'Plumbing', hours: 980 },
  { trade: 'Roofing', hours: 310 },
  { trade: 'Electrical', hours: 1240 },
  { trade: 'Drywall', hours: 180 },
  { trade: 'Carpentry', hours: 760 },
  { trade: 'Tiling', hours: 140 },
  { trade: 'HVAC', hours: 540 },
  { trade: 'Landscaping', hours: 90 },
  { trade: 'Painting', hours: 220 },
]

// The default `maxSlices` is 5: the four largest trades get a slice each, and the five smallest
// are summed into "Other", which is always neutral.
export default function ManyParts() {
  return (
    <DonutChart
      data={trades}
      x="trade"
      y="hours"
      centerLabel="hours"
      title={meta.title}
      description="October. Electrical and plumbing are half of all hours; five small trades are grouped as Other."
    />
  )
}
