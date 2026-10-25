import { StripPlot } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'strip-plot/delivery-days',
  title: 'Days to deliver, promised against actual',
  rscSafe: true,
} satisfies ExampleMeta

const promised = [5, 2, 3, 5, 2, 2, 3, 2, 4, 5, 2, 2, 5, 4, 2, 2, 4, 2, 5, 4, 5, 2, 3, 4]
const actual = [8, 3, 4, 7, 4, 4, 4, 1, 3, 6, 2, 3, 5, 4, 3, 3, 6, 2, 7, 3, 7, 2, 5, 5]
const orders = promised.map((p, i) => ({ order: `#${2101 + i}`, promised: p, actual: actual[i] }))

// Props stay serializable (`value` is a field name, not a function): the page is a server component.
export default function DeliveryDays() {
  return (
    <StripPlot
      title={meta.title}
      description="Across 24 orders, the median promise is 3 days and the median delivery 4. 16 orders arrived later than promised."
      data={orders}
      label="order"
      series={[
        { id: 'promised', label: 'Promised', value: 'promised' },
        { id: 'actual', label: 'Actual', value: 'actual', tone: 'warn' },
      ]}
      domain={[0, 9]}
      axis={9}
    />
  )
}
