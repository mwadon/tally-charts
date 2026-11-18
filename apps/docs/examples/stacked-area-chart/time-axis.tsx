import { StackedAreaChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'stacked-area-chart/time-axis',
  title: 'Crew hours per month',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { date: '2026-01-01', install: 180, service: 120, warranty: 60 },
  { date: '2026-02-01', install: 190, service: 125, warranty: 55 },
  { date: '2026-03-01', install: 200, service: 118, warranty: 65 },
  { date: '2026-04-01', install: 210, service: 130, warranty: 68 },
  { date: '2026-05-01', install: 205, service: 140, warranty: 62 },
  { date: '2026-06-01', install: 220, service: 138, warranty: 58 },
  { date: '2026-07-01', install: 235, service: 145, warranty: 66 },
  { date: '2026-08-01', install: 240, service: 150, warranty: 72 },
]

// On a time axis `forecastFrom` can be any date; the rule sits at the last month before it (June here).
export default function TimeAxis() {
  return (
    <StackedAreaChart
      data={months}
      x={{ field: 'date', type: 'time' }}
      series={[
        { id: 'install', label: 'Install', value: 'install' },
        { id: 'service', label: 'Service', value: 'service' },
        { id: 'warranty', label: 'Warranty', value: 'warranty', tone: 'neutral' },
      ]}
      forecastFrom="2026-07-01"
      forecastLabel="today"
      height={260}
      title={meta.title}
      description="Hours grow from January to August; the rule is at June, and July and August are booked."
    />
  )
}
