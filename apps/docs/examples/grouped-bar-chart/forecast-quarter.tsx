'use client'

import { GroupedBarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'grouped-bar-chart/forecast-quarter',
  title: 'Jobs by crew, with a forecast quarter',
  rscSafe: false,
} satisfies ExampleMeta

const quarters = [
  { quarter: 'Q1', north: 42, south: 35, west: 18, forecast: false },
  { quarter: 'Q2', north: 48, south: 38, west: 27, forecast: false },
  { quarter: 'Q3', north: 55, south: 36, west: 33, forecast: false },
  { quarter: 'Q4', north: 61, south: 44, west: 41, forecast: true },
]

// 'use client': `fill` is a function, which a server component cannot pass.
export default function ForecastQuarter() {
  return (
    <GroupedBarChart
      data={quarters}
      x="quarter"
      series={[
        { id: 'north', label: 'North', value: 'north' },
        { id: 'south', label: 'South', value: 'south' },
        { id: 'west', label: 'West', value: 'west', tone: 'neutral' },
      ]}
      fill={(d) => (d.forecast ? 'hatch' : undefined)}
      domain={[0, 80]}
      height={260}
      title={meta.title}
      description="Q4 is a forecast and is hatched. North is forecast to complete 61 jobs."
    />
  )
}
