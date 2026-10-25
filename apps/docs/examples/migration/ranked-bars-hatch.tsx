import { RankedBars } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/ranked-bars-hatch',
  title: 'Cost overruns by cause',
  rscSafe: true,
} satisfies ExampleMeta

const causes = [
  { name: 'Labor overruns', amount: 31200 },
  { name: 'Material waste', amount: 18400 },
  { name: 'Rework', amount: 12900 },
  { name: 'Equipment rental', amount: 7600 },
]

// 0.9 drew these hatched by default. In 1.0 you ask for it with fill="hatch".
export default function RankedBarsHatch() {
  return (
    <RankedBars
      data={causes}
      label="name"
      value="amount"
      format="currency-compact"
      fill="hatch"
      title={meta.title}
    />
  )
}
