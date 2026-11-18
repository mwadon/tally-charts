import type { Meta, StoryObj } from '@storybook/react-vite'
import { GroupedBarChart, Legend } from 'tally-charts'

// Fictional crews and job counts.
const quarters = [
  { quarter: 'Q1', north: 42, south: 35, west: 18 },
  { quarter: 'Q2', north: 48, south: 38, west: 27 },
  { quarter: 'Q3', north: 55, south: 36, west: 33 },
  { quarter: 'Q4 forecast', north: 61, south: 44, west: 41 },
]

type Quarter = (typeof quarters)[number]

function JobsByCrew({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Jobs completed by crew</h2>
        <span className="card-meta">Per quarter</span>
      </header>
      <GroupedBarChart
        data={quarters}
        x="quarter"
        orientation={orientation}
        series={[
          { id: 'north', label: 'North', value: 'north', tone: 'accent' },
          { id: 'south', label: 'South', value: 'south', tone: 'accent-soft' },
          { id: 'west', label: 'West', value: 'west', tone: 'neutral' },
        ]}
        fill={(d: Quarter) => (d.quarter === 'Q4 forecast' ? 'hatch' : undefined)}
        domain={[0, 80]}
        height={orientation === 'vertical' ? 260 : undefined}
        title="Jobs completed by crew, per quarter"
        description="North completed the most jobs every quarter; Q4 is a forecast."
      />
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'North', tone: 'accent' },
            { label: 'South', tone: 'accent-soft' },
            { label: 'West', tone: 'neutral' },
            { label: 'Forecast', tone: 'neutral', fill: 'hatch' },
          ]}
        />
      </div>
    </article>
  )
}

const meta = {
  title: 'Charts/GroupedBarChart',
  component: JobsByCrew,
} satisfies Meta<typeof JobsByCrew>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
export const Horizontal: Story = { args: { orientation: 'horizontal' } }

const margins = [
  { month: 'Jul', hardware: 12, services: -8 },
  { month: 'Aug', hardware: -5, services: 6 },
  { month: 'Sep', hardware: 9, services: 14 },
]

// Mixed signs: bars grow either side of the zero line.
export const Negative: Story = {
  render: () => (
    <article className="card">
      <GroupedBarChart
        data={margins}
        x="month"
        series={[
          { id: 'hardware', label: 'Hardware', value: 'hardware' },
          { id: 'services', label: 'Services', value: 'services' },
        ]}
        domain={[-20, 20]}
        height={240}
        title="Margin change by product line"
        description="Hardware dipped in August; services dipped in July."
      />
    </article>
  ),
}

const regions = [
  { region: 'Q1', a: 30, b: 24, c: 18, d: 12, e: 8 },
  { region: 'Q2', a: 34, b: 28, c: 20, d: 15, e: 10 },
  { region: 'Q3', a: 38, b: 26, c: 22, d: 17, e: 12 },
]

// Five series: bars get thin and every default tone is used once.
export const FiveSeries: Story = {
  render: () => (
    <article className="card">
      <GroupedBarChart
        data={regions}
        x="region"
        series={['a', 'b', 'c', 'd', 'e'].map((k) => ({
          id: k,
          label: `Crew ${k.toUpperCase()}`,
          value: k,
        }))}
        height={260}
        title="Jobs by crew, five crews"
        description="Crew A completed the most jobs in every quarter."
      />
    </article>
  ),
}
