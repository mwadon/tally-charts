import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'visual-language/target',
  title: 'Actual by quarter against a target',
  rscSafe: true,
} satisfies ExampleMeta

const quarters = [
  { q: 'Q1', v: 40 },
  { q: 'Q2', v: 53 },
  { q: 'Q3', v: 72 },
]

// Props stay serializable (no functions): the page is a server component.
export default function VisualLanguageTarget() {
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
      fill="solid"
      target={50}
      title={meta.title}
      description="Three bars against a target of 50; Q2 and Q3 reach it."
    />
  )
}
