import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { type Id, RankedBars } from 'tally-charts'

// docs/reference/06-drilldown-strip-plot.png, "From all leakage to the people and jobs behind it".
type Row = { name: string; amount: number; jobs?: string }

const causes: Row[] = [
  { name: 'Labor overruns', amount: 31200 },
  { name: 'Material variance', amount: 18700 },
  { name: 'Callbacks', amount: 14400 },
  { name: 'Discounting', amount: 9800 },
  { name: 'Unbilled work', amount: 8300 },
]
const branches: Row[] = [
  { name: 'Dallas', amount: 14800 },
  { name: 'Austin', amount: 9200 },
  { name: 'Houston', amount: 7200 },
]
const jobTypes: Row[] = [
  { name: 'Installations', amount: 8200 },
  { name: 'Repairs', amount: 4300 },
  { name: 'Maintenance', amount: 2300 },
]
const technicians: Row[] = [
  { name: 'Tyler Brooks', amount: 2600, jobs: '9 jobs' },
  { name: 'Marcus Reed', amount: 1900, jobs: '7 jobs' },
  { name: 'Ryan Mitchell', amount: 1600, jobs: '6 jobs' },
  { name: 'Diego Alvarez', amount: 1100, jobs: '4 jobs' },
  { name: 'Chris Pham', amount: 1000, jobs: '3 jobs' },
]

function Column(props: {
  title: string
  total: string
  rows: Row[]
  selected: Id | null
  onSelect: (id: Id) => void
}) {
  return (
    <section>
      <header className="drill-header">
        <span>{props.title}</span>
        <span>{props.total}</span>
      </header>
      <RankedBars
        data={props.rows}
        label="name"
        value="amount"
        meta={props.rows.some((r) => r.jobs) ? 'jobs' : undefined}
        format="currency-compact"
        layout="stacked"
        selectedId={props.selected}
        onSelect={(id) => props.onSelect(id)}
        title={`Leakage by ${props.title.toLowerCase()}`}
      />
    </section>
  )
}

function DrillColumns() {
  const [cause, setCause] = useState<Id | null>(0)
  const [branch, setBranch] = useState<Id | null>(0)
  const [jobType, setJobType] = useState<Id | null>(0)
  const [tech, setTech] = useState<Id | null>(null)
  return (
    <article className="card card-wide" style={{ maxWidth: 1200 }}>
      <header className="card-header card-header-stack">
        <h2 className="card-title">From all leakage to the people and jobs behind it</h2>
        <span className="card-meta">Select a row to go one level deeper. September to date.</span>
      </header>
      <div className="drill-grid">
        <Column title="Cause" total="$82.4K" rows={causes} selected={cause} onSelect={setCause} />
        <Column
          title="Branch"
          total="$31.2K"
          rows={branches}
          selected={branch}
          onSelect={setBranch}
        />
        <Column
          title="Job type"
          total="$14.8K"
          rows={jobTypes}
          selected={jobType}
          onSelect={setJobType}
        />
        <Column
          title="Technician"
          total="$8.2K"
          rows={technicians}
          selected={tech}
          onSelect={setTech}
        />
      </div>
      <output data-testid="drill-selected" className="card-text">
        Selected cause: {cause === null ? 'none' : causes[Number(cause)]?.name}
      </output>
    </article>
  )
}

const meta = {
  title: 'Reference/Drill columns',
  component: DrillColumns,
} satisfies Meta<typeof DrillColumns>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
