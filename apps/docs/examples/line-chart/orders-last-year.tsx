import { Area, LineChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'line-chart/orders-last-year',
  title: 'Weekly orders this autumn, over the same weeks last year',
  rscSafe: true,
} satisfies ExampleMeta

// One row per Monday: this year's orders, and the same week a year earlier.
const weeks = [
  { at: '2026-08-03', orders: 1210, lastYear: 1100 },
  { at: '2026-08-10', orders: 1260, lastYear: 1130 },
  { at: '2026-08-17', orders: 1190, lastYear: 1090 },
  { at: '2026-08-24', orders: 1320, lastYear: 1180 },
  { at: '2026-08-31', orders: 1380, lastYear: 1215 },
  { at: '2026-09-07', orders: 1355, lastYear: 1200 },
  { at: '2026-09-14', orders: 1440, lastYear: 1260 },
  { at: '2026-09-21', orders: 1510, lastYear: 1300 },
  { at: '2026-09-28', orders: 1480, lastYear: 1285 },
  { at: '2026-10-05', orders: 1570, lastYear: 1340 },
  { at: '2026-10-12', orders: 1640, lastYear: 1385 },
  { at: '2026-10-19', orders: 1695, lastYear: 1420 },
]

// Props stay serializable (no functions): the page is a server component. The `underlay` is a
// plain element, so it crosses the server boundary like any other prop.
export default function OrdersLastYear() {
  return (
    <LineChart
      data={weeks}
      x={{ type: 'time', field: 'at' }}
      series={[{ id: 'orders', label: 'This year', value: 'orders' }]}
      // Drawn after the grid and before the line, so last year sits behind this year.
      underlay={<Area data={weeks} x="at" y="lastYear" tone="neutral" />}
      domain={[0, 2000]}
      format="number"
      height={260}
      title={meta.title}
      description="Orders grew from 1,210 to 1,695 a week, 19% above the same week last year, which reached 1,420."
    />
  )
}
