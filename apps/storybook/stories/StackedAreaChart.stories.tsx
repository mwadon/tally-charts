import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend, StackedAreaChart } from 'tally-charts'

// Fictional crew hours per week; W10 is the first booked (forecast) week.
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

const hours = (v: number) => `${v} h`

const crewSeries = [
  { id: 'install', label: 'Install', value: 'install' as const, tone: 'accent' as const },
  { id: 'service', label: 'Service', value: 'service' as const, tone: 'accent-soft' as const },
  { id: 'warranty', label: 'Warranty', value: 'warranty' as const, tone: 'neutral' as const },
]

function CrewHours() {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Crew hours per week</h2>
        <span className="card-meta">Booked from W10</span>
      </header>
      <StackedAreaChart
        data={weeks}
        x="week"
        series={crewSeries}
        forecastFrom="W10"
        forecastLabel="today"
        xAxis={6}
        format={hours}
        height={260}
        title="Crew hours per week, booked from W10"
        description="Install is the largest part of the hours every week and keeps growing."
      />
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'Install', tone: 'accent' },
            { label: 'Service', tone: 'accent-soft' },
            { label: 'Warranty', tone: 'neutral' },
            { label: 'Booked', tone: 'accent', fill: 'hatch' },
          ]}
        />
      </div>
    </article>
  )
}

const meta = {
  title: 'Charts/StackedAreaChart',
  component: CrewHours,
} satisfies Meta<typeof CrewHours>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }

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

// Monthly dates on a time axis, with the forecast starting in June.
export const Time: Story = {
  render: () => (
    <article className="card">
      <StackedAreaChart
        data={months}
        x={{ field: 'date', type: 'time' }}
        series={crewSeries}
        forecastFrom="2026-06-01"
        forecastLabel="today"
        format={hours}
        height={260}
        title="Crew hours per month"
        description="Hours grow from January to August; June onwards is booked."
      />
    </article>
  ),
}

// No forecast, default tones, no end labels.
export const Plain: Story = {
  render: () => (
    <article className="card">
      <StackedAreaChart
        data={weeks.slice(0, 9)}
        x="week"
        series={crewSeries.map(({ id, label, value }) => ({ id, label, value }))}
        endLabels={false}
        format={hours}
        height={260}
        title="Crew hours per week"
        description="Install is the largest part of the hours every week."
      />
    </article>
  ),
}

const crews = weeks.map((w) => ({
  week: w.week,
  install: w.install,
  service: w.service,
  warranty: w.warranty,
  training: 30 + (w.warranty % 7),
  admin: 20 + (w.service % 9),
}))

// Five series: neighbouring end labels would be too close, so none is drawn; the legend names them.
export const ManySeries: Story = {
  render: () => (
    <article className="card">
      <StackedAreaChart
        data={crews}
        x="week"
        series={[
          ...crewSeries.map(({ id, label, value }) => ({ id, label, value })),
          { id: 'training', label: 'Training', value: 'training' as const },
          { id: 'admin', label: 'Admin', value: 'admin' as const },
        ]}
        xAxis={6}
        format={hours}
        height={260}
        title="Crew hours per week by activity"
        description="Five activities; training and admin are the smallest."
      />
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'Install', tone: 'accent' },
            { label: 'Service', tone: 'accent-soft' },
            { label: 'Warranty', tone: 'warn' },
            { label: 'Training', tone: 'neutral' },
            { label: 'Admin', tone: 'gain' },
          ]}
        />
      </div>
    </article>
  ),
}
