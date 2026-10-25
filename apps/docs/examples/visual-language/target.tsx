import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'visual-language/target',
  title: 'Actual by quarter against a target',
  rscSafe: true,
} satisfies ExampleMeta

const quarters = [
  { q: 'Q1', v: 42 },
  { q: 'Q2', v: 48 },
  { q: 'Q3', v: 53 },
  { q: 'Q4', v: 61 },
]

// Props stay serializable (no functions): the page is a server component.
export default function VisualLanguageTarget() {
  return (
    <BarChart
      data={quarters}
      x="q"
      y="v"
      domain={[0, 70]}
      height={140}
      valueLabel="none"
      axis="all"
      fill="solid"
      target={{ value: 55, label: 'Target' }}
      title={meta.title}
      description="Four bars against a target of 55; only Q4 reaches it."
    />
  )
}
