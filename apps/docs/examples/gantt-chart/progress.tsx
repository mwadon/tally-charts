import { GanttChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'gantt-chart/progress',
  title: 'Office move',
  rscSafe: true,
} satisfies ExampleMeta

// The done share of each step, from 0 to 1, as a team would report it.
const steps = [
  { step: 'Pick the space', from: '2026-01-05', to: '2026-01-23', done: 1 },
  { step: 'Sign the lease', from: '2026-01-26', to: '2026-02-06', done: 1 },
  { step: 'Network and power', from: '2026-02-09', to: '2026-03-06', done: 0.6 },
  { step: 'Furniture order', from: '2026-02-16', to: '2026-03-13', done: 0.25 },
  { step: 'Packing', from: '2026-03-09', to: '2026-03-20', done: 0 },
  { step: 'Move day', from: '2026-03-21', to: '2026-03-23', done: 0 },
]

// `progress` without `now`: the done share splits each bar into solid and hatched, and there is
// no today line.
export default function Progress() {
  return (
    <GanttChart
      data={steps}
      x="step"
      start="from"
      end="to"
      progress="done"
      title={meta.title}
      description="Two steps are done; network and furniture are under way."
    />
  )
}
