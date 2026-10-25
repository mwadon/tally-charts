import { LineChart } from 'tally-charts'
import {
  createDateFormatter,
  type DateFormatOptions,
  type DateFormatSpec,
  type DateFormatter,
} from 'tally-charts/core'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/date-formatter',
  title: 'Orders per month',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { at: '2026-05-01', orders: 5210 },
  { at: '2026-06-01', orders: 5480 },
  { at: '2026-07-01', orders: 5390 },
  { at: '2026-08-01', orders: 5920 },
  { at: '2026-09-01', orders: 6310 },
]

const spec: DateFormatSpec = 'month'
const options: DateFormatOptions = { locale: 'en-US' }
// Build it once, outside the component. It maps epoch milliseconds to a string.
const monthName: DateFormatter = createDateFormatter(spec, options)

export default function DateFormatterExample() {
  return (
    <LineChart
      data={months}
      x={{ type: 'time', field: 'at' }}
      series={[{ id: 'orders', label: 'Orders', value: 'orders' }]}
      format="number"
      height={220}
      title={meta.title}
      description={`Orders reached 6,310 in ${monthName(Date.UTC(2026, 8, 1))}.`}
    />
  )
}
