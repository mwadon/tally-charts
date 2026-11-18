import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend, StackedBarChart } from 'tally-charts'

// Fictional monthly job cost, in thousands of dollars.
const months = [
  { month: 'Jan', labor: 24, materials: 18, subcontract: 9 },
  { month: 'Feb', labor: 26, materials: 20, subcontract: 10 },
  { month: 'Mar', labor: 27, materials: 20, subcontract: 11 },
  { month: 'Apr', labor: 28, materials: 21, subcontract: 17 },
  { month: 'May', labor: 27, materials: 19, subcontract: 10 },
  { month: 'Jun', labor: 29, materials: 20, subcontract: 20 },
]

const costSeries = [
  { id: 'labor', label: 'Labor', value: 'labor' as const, tone: 'accent' as const },
  {
    id: 'materials',
    label: 'Materials',
    value: 'materials' as const,
    tone: 'accent-soft' as const,
  },
  {
    id: 'subcontract',
    label: 'Subcontract',
    value: 'subcontract' as const,
    tone: 'neutral' as const,
  },
]

const thousands = (v: number) => `$${v}k`

function MonthlyCost({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Monthly job cost</h2>
        <span className="card-meta">Against a $60k budget</span>
      </header>
      <StackedBarChart
        data={months}
        x="month"
        orientation={orientation}
        series={costSeries}
        target={{ value: 60, label: 'budget $60k', over: 'loss' }}
        domain={[0, 80]}
        format={thousands}
        height={orientation === 'vertical' ? 260 : undefined}
        title="Monthly job cost against the $60k budget"
        description="April and June ran over budget, both because of subcontract work."
      />
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'Labor', tone: 'accent' },
            { label: 'Materials', tone: 'accent-soft' },
            { label: 'Subcontract', tone: 'neutral' },
            { label: 'Over budget', tone: 'loss' },
          ]}
        />
      </div>
    </article>
  )
}

const meta = {
  title: 'Charts/StackedBarChart',
  component: MonthlyCost,
} satisfies Meta<typeof MonthlyCost>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
export const Horizontal: Story = { args: { orientation: 'horizontal' } }

const margins = [
  { month: 'Jul', hardware: 12, services: -8, support: 4 },
  { month: 'Aug', hardware: -5, services: 6, support: -3 },
  { month: 'Sep', hardware: 9, services: 14, support: 5 },
]

// Mixed signs: negatives stack down from zero on their own.
export const Negative: Story = {
  render: () => (
    <article className="card">
      <StackedBarChart
        data={margins}
        x="month"
        series={[
          { id: 'hardware', label: 'Hardware', value: 'hardware' },
          { id: 'services', label: 'Services', value: 'services' },
          { id: 'support', label: 'Support', value: 'support' },
        ]}
        height={240}
        title="Margin change by product line"
        description="Hardware and support dipped in August; services dipped in July."
      />
    </article>
  ),
}

// No target and default tones.
export const Plain: Story = {
  render: () => (
    <article className="card">
      <StackedBarChart
        data={months}
        x="month"
        series={costSeries.map(({ id, label, value }) => ({ id, label, value }))}
        height={260}
        title="Monthly job cost"
        description="Labor is the largest part of the cost every month."
      />
    </article>
  ),
}
