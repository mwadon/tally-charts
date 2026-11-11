'use client'

import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'bar-chart/margin-vs-target',
  title: 'Margin by week, last 6 weeks',
  rscSafe: false,
} satisfies ExampleMeta

const TARGET = 32

const weeks = [
  { week: 'W1', margin: 34.2 },
  { week: 'W2', margin: 35.1 },
  { week: 'W3', margin: 33.0 },
  { week: 'W4', margin: 33.6 },
  { week: 'W5', margin: 30.2 },
  { week: 'W6', margin: 29.4 },
]

export default function MarginVsTarget() {
  return (
    <BarChart
      data={weeks}
      x="week"
      y="margin"
      domain={[26, 36]}
      format="percent"
      height={240}
      axis="all"
      fill="solid"
      valueLabel="all"
      target={{ value: TARGET, label: 'Target 32%' }}
      tone={(d) => (d.margin < TARGET ? 'loss' : 'accent')}
      title={meta.title}
      description="Margin stayed above the 32% target for four weeks; W5 (30.2%) and W6 (29.4%) fell under it."
    />
  )
}
