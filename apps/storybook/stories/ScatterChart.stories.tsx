import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend, ScatterChart } from 'tally-charts'

// Fictional jobs: estimate in dollars, margin in percent, crew hours.
const jobs = [
  { name: 'Alder Court', estimate: 8000, margin: 44, hours: 40 },
  { name: 'Birch Lane', estimate: 12000, margin: 38, hours: 58 },
  { name: 'Cedar Row', estimate: 15000, margin: 52, hours: 40 },
  { name: 'Dune House', estimate: 22000, margin: 41, hours: 103 },
  { name: 'Elm Terrace', estimate: 26000, margin: 35, hours: 79 },
  { name: 'Fern Hill', estimate: 34000, margin: 46, hours: 103 },
  { name: 'Grove Flats', estimate: 38000, margin: 33, hours: 160 },
  { name: 'Hazel Yard', estimate: 48000, margin: 39, hours: 160 },
  { name: 'Ivy Works', estimate: 60000, margin: 36, hours: 231 },
  { name: 'Juniper Mill', estimate: 88000, margin: 34, hours: 520 },
  { name: 'Kestrel Barn', estimate: 18000, margin: 29, hours: 79 },
  { name: 'Larch Depot', estimate: 30000, margin: 24, hours: 130 },
  { name: 'Maple Arcade', estimate: 44000, margin: 18, hours: 231 },
  { name: 'North Quay', estimate: 55000, margin: 27, hours: 271 },
  { name: 'Orchard Mews', estimate: 74000, margin: 30, hours: 361 },
  { name: 'Harbor Lofts', estimate: 68000, margin: 12, hours: 410 },
]

type Job = (typeof jobs)[number]

function Jobs() {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Margin by job size</h2>
        <span className="card-meta">Bubble area is crew hours</span>
      </header>
      <ScatterChart
        data={jobs}
        x="estimate"
        y="margin"
        size="hours"
        label="name"
        xLabel="Estimate"
        yLabel="Margin"
        sizeLabel="Hours"
        xFormat="currency-compact"
        yFormat={(v) => `${v}%`}
        sizeFormat={(v) => `${v} h`}
        tone={(j: Job) => (j.margin < 32 ? 'loss' : 'accent')}
        target={{ value: 32, label: 'target 32%' }}
        title="Margin by job size"
        description="Bigger jobs tend to earn a lower margin; six jobs sit under the 32% target."
      />
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'At or above target', tone: 'accent' },
            { label: 'Under target', tone: 'loss' },
          ]}
        />
      </div>
    </article>
  )
}

const meta = {
  title: 'Charts/ScatterChart',
  component: Jobs,
} satisfies Meta<typeof Jobs>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }

// No size, no target, one tone: plain dots on two axes.
export const Dots: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card">
      <ScatterChart
        data={jobs}
        x="estimate"
        y="margin"
        label="name"
        xLabel="Estimate"
        yLabel="Margin"
        xFormat="currency-compact"
        yFormat={(v) => `${v}%`}
        tone="accent"
        title="Margin by estimate"
        description="Each dot is a job."
      />
    </article>
  ),
}

// Function accessors and no label: the data table and keyboard fall back to generic names.
export const Plain: Story = {
  render: () => (
    <article className="card">
      <ScatterChart
        data={jobs}
        x={(j: Job) => j.estimate}
        y={(j: Job) => j.margin}
        size={(j: Job) => j.hours}
        title="Margin by estimate and hours"
        description="Margin against estimate, sized by crew hours."
      />
    </article>
  ),
}

// A small seeded generator so the cloud is the same on every run.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const rand = seeded(20261119)
const cloud = Array.from({ length: 60 }, (_, i) => {
  const estimate = Math.round((6000 + rand() * rand() * 90000) / 500) * 500
  return {
    name: `Job ${i + 1}`,
    estimate,
    margin: Math.round(10 + rand() * 45),
    hours: Math.round(20 + rand() * 380),
  }
})

// Sixty jobs, many overlapping: translucent bubbles still show what lies under them.
export const Dense: Story = {
  render: () => (
    <article className="card">
      <ScatterChart
        data={cloud}
        x="estimate"
        y="margin"
        size="hours"
        label="name"
        xLabel="Estimate"
        yLabel="Margin"
        xFormat="currency-compact"
        yFormat={(v) => `${v}%`}
        maxRadius={12}
        title="Margin by estimate, sixty jobs"
        description="Most jobs are small; bubbles overlap near the left edge."
      />
    </article>
  ),
}
