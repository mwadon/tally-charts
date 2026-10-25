import { LineChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/invalid-dates',
  title: 'Orders per week, rows with a bad date dropped',
  rscSafe: true,
} satisfies ExampleMeta

const rows = [
  { date: '2026-09-07', orders: 1355 },
  { date: '2026-09-14', orders: 1440 },
  { date: 'not a date', orders: 1500 },
  { date: '2026-09-28', orders: 1480 },
  { date: '2026-10-05', orders: 1570 },
]

// 1.0 breaks the line at a row whose date is not a date. Filter such rows first to keep it joined.
// The filter runs where the page renders, so no function reaches the chart's props.
export default function InvalidDates() {
  return (
    <LineChart
      data={rows.filter((r) => !Number.isNaN(new Date(r.date).getTime()))}
      x={{ type: 'time', field: 'date' }}
      series={[{ id: 'orders', label: 'Orders', value: 'orders' }]}
      format="number"
      height={220}
      title={meta.title}
    />
  )
}
