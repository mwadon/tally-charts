'use client'

import { createFormatter, fmt, LineChart } from 'tally-charts'
import { createDateFormatter } from 'tally-charts/core'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'formatting/formatters',
  title: 'Euro revenue with formatters built in code',
  rscSafe: false,
} satisfies ExampleMeta

const revenue = [
  { date: '2026-01-01', revenue: 12400 },
  { date: '2026-02-01', revenue: 13850 },
  { date: '2026-03-01', revenue: 15200 },
  { date: '2026-04-01', revenue: 14700 },
  { date: '2026-05-01', revenue: 16900 },
  { date: '2026-06-01', revenue: 18350 },
]

// Built once, outside the component. Both take their locale as an option, so they don't need a
// ChartsProvider. The month step makes the date formatter write "Jun 2026", not a full date.
const euros = createFormatter(
  { preset: 'currency', digits: 0 },
  { locale: 'de-DE', currency: 'EUR' },
)
const month = createDateFormatter('month', { locale: 'de-DE', step: 30 * 864e5 })

// Functions can't cross from a Server Component, so this file is a client component.
export default function Formatters() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <LineChart
        data={revenue}
        x={{ type: 'time', field: 'date' }}
        series={[{ id: 'revenue', label: 'Revenue', value: 'revenue' }]}
        format={euros}
        xAxisFormat={(tick) => month(Number(tick))}
        height={260}
        title="Revenue by month, formatted with createFormatter and createDateFormatter"
        description="Revenue grew from 12.400 € in January 2026 to 18.350 € in June."
      />
      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
        <li>fmt.currency(18350) is {fmt.currency(18350)}</li>
        <li>fmt.currencyCompact(1840000) is {fmt.currencyCompact(1840000)}</li>
        <li>fmt.percent(3.9) is {fmt.percent(3.9)}</li>
        <li>fmt.pts(0.6) is {fmt.pts(0.6)}</li>
        <li>fmt.hours(126.5) is {fmt.hours(126.5)}</li>
        <li>euros(18350) is {euros(18350)}</li>
      </ul>
    </div>
  )
}
