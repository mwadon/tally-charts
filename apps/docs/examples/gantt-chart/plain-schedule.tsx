import { GanttChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'gantt-chart/plain-schedule',
  title: 'Deck build',
  rscSafe: true,
} satisfies ExampleMeta

const steps = [
  { task: 'Permits', from: '2026-05-04', to: '2026-05-15' },
  { task: 'Footings', from: '2026-05-18', to: '2026-05-21' },
  { task: 'Framing', from: '2026-05-21', to: '2026-05-29' },
  { task: 'Decking', from: '2026-06-01', to: '2026-06-06' },
  { task: 'Railings', from: '2026-06-08', to: '2026-06-12' },
  { task: 'Stain and seal', from: '2026-06-15', to: '2026-06-17' },
]

// Only `x`, `start` and `end`. Without `now` or `progress` every task is drawn solid, and with
// one kind of mark there is no key.
export default function PlainSchedule() {
  return (
    <GanttChart
      data={steps}
      x="task"
      start="from"
      end="to"
      title={meta.title}
      description="Six steps from May 4 to June 17; permits take the longest."
    />
  )
}
