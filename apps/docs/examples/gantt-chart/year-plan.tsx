import { GanttChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'gantt-chart/year-plan',
  title: 'Year plan',
  rscSafe: true,
} satisfies ExampleMeta

// Twelve fictional work items over 2026 in three streams.
const items = [
  { task: 'Customer interviews', stream: 'Research', from: '2026-01-05', to: '2026-02-13' },
  { task: 'Market sizing', stream: 'Research', from: '2026-01-19', to: '2026-02-27' },
  { task: 'Pricing study', stream: 'Research', from: '2026-02-16', to: '2026-03-27' },
  { task: 'Prototype', stream: 'Build', from: '2026-03-02', to: '2026-04-24' },
  { task: 'Pilot with two crews', stream: 'Build', from: '2026-04-20', to: '2026-06-05' },
  { task: 'Mobile app', stream: 'Build', from: '2026-05-04', to: '2026-08-14' },
  { task: 'Billing', stream: 'Build', from: '2026-06-01', to: '2026-08-28' },
  { task: 'Hardening', stream: 'Build', from: '2026-08-17', to: '2026-10-02' },
  { task: 'Website', stream: 'Launch', from: '2026-07-06', to: '2026-09-18' },
  { task: 'Training videos', stream: 'Launch', from: '2026-09-07', to: '2026-10-30' },
  { task: 'Partner program', stream: 'Launch', from: '2026-10-05', to: '2026-12-04' },
  { task: 'Launch campaign', stream: 'Launch', from: '2026-10-19', to: '2026-12-18' },
]

// A year of work: in a docs card the axis has quarter ticks (a wider plot gets months). The value
// labels count the days of each task, and give the done share of the two running on June 15.
export default function YearPlan() {
  return (
    <GanttChart
      data={items}
      x="task"
      start="from"
      end="to"
      group="stream"
      now="2026-06-15"
      title={meta.title}
      description="Research is done, build is under way, launch starts in July."
    />
  )
}
