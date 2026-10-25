import { RankedBars } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'ranked-bars/hatch-plan',
  title: 'Planned hours by technician',
  rscSafe: true,
} satisfies ExampleMeta

const plan = [
  { name: 'Tyler Brooks', hours: 62, jobs: '9 jobs' },
  { name: 'Dana Ortiz', hours: 54, jobs: '8 jobs' },
  { name: 'Sam Patel', hours: 47, jobs: '6 jobs' },
  { name: 'Priya Nair', hours: 31, jobs: '4 jobs' },
]

// fill="hatch" gives the bars the look of a plan or a reference. `meta` adds the muted column.
export default function HatchPlan() {
  return (
    <RankedBars
      data={plan}
      label="name"
      value="hours"
      meta="jobs"
      format="hours"
      fill="hatch"
      title={meta.title}
      description="Tyler Brooks is planned for 62 hours across 9 jobs, Priya Nair for 31 hours across 4."
    />
  )
}
