import { StackedAreaChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'stacked-area-chart/hours-by-type',
  title: 'Crew hours per week, by type of work',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', install: 180, service: 120, warranty: 60 },
  { week: 'W2', install: 190, service: 125, warranty: 55 },
  { week: 'W3', install: 200, service: 118, warranty: 65 },
  { week: 'W4', install: 210, service: 130, warranty: 68 },
  { week: 'W5', install: 205, service: 140, warranty: 62 },
  { week: 'W6', install: 220, service: 138, warranty: 58 },
  { week: 'W7', install: 235, service: 145, warranty: 66 },
  { week: 'W8', install: 240, service: 150, warranty: 72 },
  { week: 'W9', install: 250, service: 155, warranty: 70 },
]

// Props stay serializable (no functions): the page is a server component.
export default function HoursByType() {
  return (
    <StackedAreaChart
      data={weeks}
      x="week"
      series={[
        { id: 'install', label: 'Install', value: 'install' },
        { id: 'service', label: 'Service', value: 'service' },
        { id: 'warranty', label: 'Warranty', value: 'warranty', tone: 'neutral' },
      ]}
      height={260}
      title={meta.title}
      description="Install is the largest part of the hours every week and grows from 180 to 250 hours."
    />
  )
}
