'use client'

import { useState } from 'react'
import { Delta, type Id, RankedBars, StripPlot } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/06-drilldown-strip-plot',
  title: 'Drill-down: from all leakage to the people and jobs behind it',
  rscSafe: false,
} satisfies ExampleMeta

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

const estimated = [
  5.2, 5.6, 5.7, 5.8, 5.8, 5.9, 5.9, 6.0, 6.0, 6.0, 6.1, 6.1, 6.1, 6.1, 6.1, 6.2, 6.2, 6.2, 6.3,
  6.3, 6.4, 6.4, 6.5, 6.5, 6.6, 6.7, 6.8, 7.0, 7.2,
]
const actual = [
  6.3, 6.9, 7.1, 7.2, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.0, 8.0, 8.1, 8.1, 8.2, 8.2, 8.3, 8.4, 8.5,
  8.6, 8.8, 9.0, 9.2, 9.5, 9.8, 10.2, 10.6, 11.0, 11.6,
]
const installs = estimated.map((est, i) => ({ job: `#${5900 + i}`, est, act: actual[i] ?? null }))

function Column(props: {
  title: string
  total: string
  rows: Row[]
  selected: Id | null
  onSelect: (id: Id) => void
}) {
  return (
    <section>
      <header className="ref-drill-header">
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
        // The reference hatches these bars; RankedBars is solid by default.
        fill="hatch"
        selectedId={props.selected}
        onSelect={(id) => props.onSelect(id)}
        title={`Leakage by ${props.title.toLowerCase()}`}
      />
    </section>
  )
}

// 'use client': the selection is state, and onSelect is a function.
export default function DrilldownStripPlot() {
  const [cause, setCause] = useState<Id | null>(0)
  const [branch, setBranch] = useState<Id | null>(0)
  const [jobType, setJobType] = useState<Id | null>(0)
  const [tech, setTech] = useState<Id | null>(null)
  return (
    <div className="ref-dashboard">
      <article className="ref-card ref-card-wide">
        <header className="ref-card-header ref-card-header-stack">
          <h2 className="ref-card-title">From all leakage to the people and jobs behind it</h2>
          <span className="ref-card-meta">
            Select a row to go one level deeper. September to date.
          </span>
        </header>
        <div className="ref-drill-grid">
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
      </article>

      <article className="ref-card ref-card-wide">
        <header className="ref-card-header-row">
          <div>
            <h2 className="ref-card-title">29 Dallas installs, hours per job</h2>
            <span className="ref-card-meta">Each dot is one install, estimated against actual</span>
          </div>
          <Delta value={34} format="percent" good="down" signed />
        </header>
        <StripPlot
          title="Install hours, estimated against actual"
          description="Installs take 8.2 hours at the median against 6.1 estimated."
          data={installs}
          label="job"
          series={[
            { id: 'est', label: 'Estimated', value: 'est', tone: 'accent-soft' },
            { id: 'act', label: 'Actual', value: 'act', tone: 'loss' },
          ]}
          format="hours"
          domain={[4, 12]}
          axisFormat={(v) => `${v} h`}
          radius={4}
        />
      </article>
    </div>
  )
}
