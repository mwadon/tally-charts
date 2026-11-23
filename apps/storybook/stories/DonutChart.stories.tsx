import type { Meta, StoryObj } from '@storybook/react-vite'
import { DonutChart } from 'tally-charts'

// Fictional revenue of a contractor by service line; total 1,840,000.
const lines = [
  { line: 'Installs', revenue: 773000 },
  { line: 'Service plans', revenue: 442000 },
  { line: 'Repairs', revenue: 294000 },
  { line: 'Inspections', revenue: 184000 },
  { line: 'Maintenance', revenue: 62000 },
  { line: 'Consulting', revenue: 41000 },
  { line: 'Parts', revenue: 28000 },
  { line: 'Permits', revenue: 16000 },
]

// The artboards are 640 px wide: the list fits right of the ring (the default card is too narrow).
const ARTBOARD = { maxWidth: 640 }

function RevenueByLine() {
  return (
    <article className="card" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">Revenue by service line</h2>
        <span className="card-meta">Q3</span>
      </header>
      <DonutChart
        data={lines}
        x="line"
        y="revenue"
        format="currency-compact"
        centerLabel="total revenue"
        title="Revenue by service line"
        description="Q3. Installs bring 42% of revenue; the four smallest lines are grouped as Other."
      />
    </article>
  )
}

const meta = {
  title: 'Charts/DonutChart',
  component: RevenueByLine,
} satisfies Meta<typeof RevenueByLine>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }

const jobs = [
  { status: 'Completed', jobs: 128 },
  { status: 'In progress', jobs: 46 },
  { status: 'Scheduled', jobs: 22 },
]

// Three parts: every slice is a step of the base tone, none is neutral.
export const Few: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">Jobs by status</h2>
      </header>
      <DonutChart
        data={jobs}
        x="status"
        y="jobs"
        centerLabel="jobs"
        title="Jobs by status"
        description="This week. Two thirds of the jobs are completed."
      />
    </article>
  ),
}

// The list under the ring, at full width.
export const Bottom: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Revenue by service line</h2>
      </header>
      <DonutChart
        data={lines}
        x="line"
        y="revenue"
        format="currency-compact"
        centerLabel="total revenue"
        legendPosition="bottom"
        title="Revenue by service line"
        description="Q3. Installs bring 42% of revenue."
      />
    </article>
  ),
}

// Defaults only: no theme of its own, `x` and `y`.
export const Plain: Story = {
  render: () => (
    <article className="card">
      <DonutChart data={lines} x="line" y="revenue" title="Revenue by line" />
    </article>
  ),
}

// Nine parts in data order: the five smallest are summed into "Other".
export const Many: Story = {
  render: () => (
    <article className="card" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">Revenue by service line</h2>
      </header>
      <DonutChart
        data={[...lines, { line: 'Training', revenue: 12000 }]}
        x="line"
        y="revenue"
        format="currency-compact"
        sort="none"
        title="Revenue by service line, nine lines"
        description="Q3. The five smallest lines are grouped as Other."
      />
    </article>
  ),
}
