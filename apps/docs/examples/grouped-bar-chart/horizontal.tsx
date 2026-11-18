import { GroupedBarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'grouped-bar-chart/horizontal',
  title: 'Revenue by service line, this year and last',
  rscSafe: true,
} satisfies ExampleMeta

const lines = [
  { line: 'Installation', current: 128, previous: 110 },
  { line: 'Maintenance', current: 94, previous: 99 },
  { line: 'Repairs', current: 71, previous: 64 },
  { line: 'Inspections', current: 39, previous: 41 },
]

export default function Horizontal() {
  return (
    <GroupedBarChart
      data={lines}
      x="line"
      orientation="horizontal"
      series={[
        { id: 'current', label: 'This year', value: 'current' },
        {
          id: 'previous',
          label: 'Last year',
          value: 'previous',
          tone: 'neutral',
          fill: 'hatch-fade',
        },
      ]}
      format="number"
      title={meta.title}
      description="Installation earned the most, 128 against 110 last year. Maintenance and inspections fell."
    />
  )
}
