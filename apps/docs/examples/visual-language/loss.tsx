'use client'

import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'visual-language/loss',
  title: 'Result by quarter, the last one a loss',
  rscSafe: false,
} satisfies ExampleMeta

/** Below this the quarter counts as a loss. */
const LOW = 40

const quarters = [
  { q: 'Q1', v: 66 },
  { q: 'Q2', v: 57 },
  { q: 'Q3', v: 30 },
]

export default function VisualLanguageLoss() {
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
      tone={(d) => (d.v < LOW ? 'loss' : 'accent')}
      title={meta.title}
      description="Three bars, Q1 66 and Q2 57 in the accent color, Q3 30 in coral."
    />
  )
}
