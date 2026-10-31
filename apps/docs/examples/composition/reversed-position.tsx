import { LineChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/reversed-position',
  title: 'Average search position by week',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', position: 9.4 },
  { week: 'W2', position: 8.8 },
  { week: 'W3', position: 8.1 },
  { week: 'W4', position: 7.2 },
  { week: 'W5', position: 6.9 },
  { week: 'W6', position: 5.6 },
  { week: 'W7', position: 5.9 },
  { week: 'W8', position: 4.3 },
  { week: 'W9', position: 3.8 },
  { week: 'W10', position: 3.1 },
]

// Position 1 is the best result, so the domain runs from 10 down to 1: the line climbs as the
// page ranks higher. A reversed domain works the same on Chart's `y`.
export default function ReversedPosition() {
  return (
    <LineChart
      data={weeks}
      x="week"
      series={[{ id: 'position', label: 'Average position', value: 'position' }]}
      domain={[10, 1]}
      target={{ value: 3, label: 'Goal: top 3' }}
      format={{ preset: 'number', digits: 1 }}
      yAxis={5}
      height={240}
      title={meta.title}
      description="The page climbed from an average position of 9.4 in W1 to 3.1 in W10."
    />
  )
}
