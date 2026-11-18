import { StackedBarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'stacked-bar-chart/horizontal',
  title: 'Hours booked by crew, this week',
  rscSafe: true,
} satisfies ExampleMeta

const crews = [
  { crew: 'North', install: 96, repair: 42, travel: 18 },
  { crew: 'South', install: 74, repair: 55, travel: 22 },
  { crew: 'West', install: 58, repair: 31, travel: 14 },
  { crew: 'East', install: 41, repair: 38, travel: 9 },
]

export default function Horizontal() {
  return (
    <StackedBarChart
      data={crews}
      x="crew"
      orientation="horizontal"
      series={[
        { id: 'install', label: 'Install', value: 'install' },
        { id: 'repair', label: 'Repair', value: 'repair' },
        { id: 'travel', label: 'Travel', value: 'travel', tone: 'neutral' },
      ]}
      title={meta.title}
      description="North booked the most hours, 156, mostly on installs. Travel is the smallest part for every crew."
    />
  )
}
