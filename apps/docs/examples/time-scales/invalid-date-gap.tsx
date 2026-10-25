import { LineChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'time-scales/invalid-date-gap',
  title: 'Daily sign-ups with one unreadable date',
  rscSafe: true,
} satisfies ExampleMeta

// Date-only ISO strings are UTC midnight, so the axis reads the same on the server and in the
// browser. 'not a date' can't be parsed: that row is skipped (with one warning in development)
// and the line breaks after the row before it instead of joining the two neighbours.
const signups = [
  { date: '2026-01-05', signups: 42 },
  { date: '2026-01-06', signups: 48 },
  { date: '2026-01-07', signups: 51 },
  { date: '2026-01-08', signups: 47 },
  { date: 'not a date', signups: 55 },
  { date: '2026-01-10', signups: 63 },
  { date: '2026-01-11', signups: 58 },
  { date: '2026-01-12', signups: 66 },
]

// Props stay serializable (no functions): the page is a server component.
export default function InvalidDateGap() {
  return (
    <LineChart
      data={signups}
      x={{ type: 'time', field: 'date' }}
      series={[{ id: 'signups', label: 'Sign-ups', value: 'signups' }]}
      format="number"
      xAxisFormat={{ month: 'short', day: 'numeric' }}
      height={260}
      title={meta.title}
      description="Sign-ups rose from 42 on January 5 to 66 on January 12. The row for January 9 has an invalid date, so the line is broken there."
    />
  )
}
