import { RankedBars } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'ranked-bars/overruns',
  title: 'Cost overruns by category',
  rscSafe: true,
} satisfies ExampleMeta

const overruns = [
  { category: 'Labor overruns', amount: 31200 },
  { category: 'Material waste', amount: 18400 },
  { category: 'Rework', amount: 12900 },
  { category: 'Equipment rental', amount: 7600 },
  { category: 'Permits', amount: 2100 },
]

// No `fill` prop: the bars use the default, 'solid'. Props stay serializable (no functions).
export default function Overruns() {
  return (
    <RankedBars
      data={overruns}
      label="category"
      value="amount"
      format="currency-compact"
      tone="loss"
      title={meta.title}
      description="Labor overruns lead at $31.2K, followed by material waste at $18.4K. Permits cost the least, $2.1K."
    />
  )
}
