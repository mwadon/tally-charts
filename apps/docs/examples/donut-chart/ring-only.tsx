import { DonutChart, Stat } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'donut-chart/ring-only',
  title: 'Jobs by status',
  rscSafe: true,
} satisfies ExampleMeta

const jobs = [
  { status: 'Completed', jobs: 128 },
  { status: 'In progress', jobs: 46 },
  { status: 'Scheduled', jobs: 22 },
]

const layout = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  gap: '1.5rem',
} as const

// `legend={false}` draws the ring alone, centred in what is left beside the headline number; in a
// narrow card the ring shrinks to fit. The values stay in the tooltip, the announcements and the
// data table.
export default function RingOnly() {
  return (
    <div style={layout}>
      <Stat label="Completed" value={128} caption="of 196 jobs" />
      <DonutChart
        data={jobs}
        x="status"
        y="jobs"
        centerLabel="jobs"
        legend={false}
        diameter={200}
        title={meta.title}
        description="This week. 128 of 196 jobs are completed, 46 in progress and 22 scheduled."
      />
    </div>
  )
}
