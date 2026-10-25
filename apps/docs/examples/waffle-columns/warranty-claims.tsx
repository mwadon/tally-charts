'use client'

import { WaffleColumns } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'waffle-columns/warranty-claims',
  title: 'Warranty claims per month, by quarter',
  rscSafe: false,
} satisfies ExampleMeta

const months = [
  { month: 'Jan', claims: 42, quarter: 'Q1' },
  { month: 'Feb', claims: 38, quarter: 'Q1' },
  { month: 'Mar', claims: 51, quarter: 'Q1' },
  { month: 'Apr', claims: 47, quarter: 'Q2' },
  { month: 'May', claims: 55, quarter: 'Q2' },
  { month: 'Jun', claims: 49, quarter: 'Q2' },
  { month: 'Jul', claims: 60, quarter: 'Q3' },
  { month: 'Aug', claims: 66, quarter: 'Q3' },
  { month: 'Sep', claims: 58, quarter: 'Q3' },
  { month: 'Oct', claims: 91, quarter: 'Q4' },
  { month: 'Nov', claims: 84, quarter: 'Q4' },
  { month: 'Dec', claims: 73, quarter: 'Q4' },
]

// 'use client': `groupTone` and `callout` are functions, which a server component cannot pass.
export default function WarrantyClaims() {
  return (
    <WaffleColumns
      title={meta.title}
      description="Claims rose every quarter: 131, 151, 184 and 248. October was the peak with 91."
      data={months}
      x="month"
      y="claims"
      group="quarter"
      groupTone={(group) => (group === 'Q4' ? 'warn' : 'neutral')}
      callout={(d) => [{ value: 'Most claims' }, { value: d.month }, { value: `${d.claims}` }]}
      unit={5}
      height={240}
    />
  )
}
