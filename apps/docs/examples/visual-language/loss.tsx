import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'visual-language/loss',
  title: 'Loss by quarter, pink',
  rscSafe: true,
} satisfies ExampleMeta

const quarters = [
  { q: 'Q1', v: 42 },
  { q: 'Q2', v: 48 },
  { q: 'Q3', v: 53 },
  { q: 'Q4', v: 61 },
]

// Props stay serializable (no functions): the page is a server component.
export default function VisualLanguageLoss() {
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
      tone="loss"
      title={meta.title}
      description="Four pink bars, Q1 42 to Q4 61."
    />
  )
}
