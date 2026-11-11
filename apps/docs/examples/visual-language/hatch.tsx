import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'visual-language/hatch',
  title: 'Plan by quarter, hatched',
  rscSafe: true,
} satisfies ExampleMeta

const quarters = [
  { q: 'Q1', v: 42 },
  { q: 'Q2', v: 56 },
  { q: 'Q3', v: 72 },
]

// Props stay serializable (no functions): the page is a server component.
export default function VisualLanguageHatch() {
  return (
    <BarChart
      data={quarters}
      x="q"
      y="v"
      domain={[0, 80]}
      width={112}
      height={88}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      valueLabel="none"
      axis="none"
      fill="hatch"
      title={meta.title}
      description="Three hatched bars, Q1 42 to Q3 72."
    />
  )
}
