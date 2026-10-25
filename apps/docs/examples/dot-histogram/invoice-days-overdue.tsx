'use client'

import { DotHistogram, Legend, thresholds } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'dot-histogram/invoice-days-overdue',
  title: 'Open invoices by days overdue, colored by age',
  rscSafe: false,
} satisfies ExampleMeta

const overdue = [
  95, 51, 32, 9, 29, 25, 14, 65, 81, 8, 31, 22, 13, 21, 33, 7, 11, 14, 24, 93, 27, 59, 2, 2, 27, 8,
  25, 33, 7, 42, 21, 7, 4, 24, 18, 3, 5, 87, 62, 43, 12, 29, 43, 95, 34, 16, 37, 89, 12, 31, 34, 34,
  31, 8, 26, 32,
]
const invoices = overdue.map((days, i) => ({ number: `INV-${2040 + i}`, days }))

const ages = thresholds(
  [15, 30, 60],
  ['gain', 'accent-soft', 'warn', 'loss'],
  ['Under 15 days', '15 to 29 days', '30 to 59 days', '60 days or more'],
)

// 'use client': thresholds() returns an object with methods, which a server component cannot pass.
export default function InvoiceDaysOverdue() {
  return (
    <div>
      <Legend shape="dot" items={ages.legend(overdue)} />
      <DotHistogram
        title={meta.title}
        description="Of 56 open invoices, 18 are under 15 days overdue and 8 are 60 days or more. The oldest is 95 days."
        data={invoices}
        value="days"
        label="number"
        toneBy={ages}
        binWidth={5}
        domain={[0, 100]}
      />
    </div>
  )
}
