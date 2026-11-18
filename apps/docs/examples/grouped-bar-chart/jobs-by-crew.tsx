import { GroupedBarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'grouped-bar-chart/jobs-by-crew',
  title: 'Jobs completed by crew, per quarter',
  rscSafe: true,
} satisfies ExampleMeta

const quarters = [
  { quarter: 'Q1', north: 42, south: 35, west: 18 },
  { quarter: 'Q2', north: 48, south: 38, west: 27 },
  { quarter: 'Q3', north: 55, south: 36, west: 33 },
  { quarter: 'Q4', north: 61, south: 44, west: 41 },
]

// Props stay serializable (no functions): the page is a server component.
export default function JobsByCrew() {
  return (
    <GroupedBarChart
      data={quarters}
      x="quarter"
      series={[
        { id: 'north', label: 'North', value: 'north' },
        { id: 'south', label: 'South', value: 'south' },
        { id: 'west', label: 'West', value: 'west', tone: 'neutral' },
      ]}
      domain={[0, 80]}
      height={260}
      title={meta.title}
      description="North completed the most jobs every quarter, from 42 in Q1 to 61 in Q4."
    />
  )
}
