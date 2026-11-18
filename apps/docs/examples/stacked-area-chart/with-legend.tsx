import { Legend, StackedAreaChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'stacked-area-chart/with-legend',
  title: 'Crew hours per week, with a legend',
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
  { week: 'W10', install: 255, service: 158, warranty: 74 },
  { week: 'W11', install: 262, service: 162, warranty: 76 },
  { week: 'W12', install: 270, service: 165, warranty: 78 },
]

// With `endLabels={false}` the layers carry no names: compose `Legend` with the same tones and a hatched
// "Booked" item for the forecast.
export default function WithLegend() {
  return (
    <div>
      <Legend
        items={[
          { label: 'Install', tone: 'accent' },
          { label: 'Service', tone: 'accent-soft' },
          { label: 'Warranty', tone: 'neutral' },
          { label: 'Booked', tone: 'accent', fill: 'hatch' },
        ]}
      />
      <StackedAreaChart
        data={weeks}
        x="week"
        series={[
          { id: 'install', label: 'Install', value: 'install' },
          { id: 'service', label: 'Service', value: 'service' },
          { id: 'warranty', label: 'Warranty', value: 'warranty', tone: 'neutral' },
        ]}
        forecastFrom="W10"
        forecastLabel="today"
        endLabels={false}
        xAxis={6}
        height={260}
        title={meta.title}
        description="Install is the largest part of the hours every week; weeks 10 to 12 are booked."
      />
    </div>
  )
}
