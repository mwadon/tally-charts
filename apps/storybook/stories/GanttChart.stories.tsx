import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import { GanttChart } from 'tally-charts'

// A fictional kitchen remodel against its plan, all dates in 2026. A row without an end is a
// milestone. With now on Mar 27: six tasks are done, "Drywall and paint" is halfway, four are
// planned; Demolition and Plumbing rough-in ran over their baselines.
const remodel = [
  ['Site protection', 'Prep', '03-02', '03-04', '03-02', '03-04'],
  ['Demolition', 'Prep', '03-04', '03-09', '03-04', '03-08'],
  ['Haul-away', 'Prep', '03-09', '03-10', '03-08', '03-09'],
  ['Framing changes', 'Rough-in', '03-10', '03-14', '03-09', '03-13'],
  ['Plumbing rough-in', 'Rough-in', '03-14', '03-21', '03-13', '03-18'],
  ['Electrical rough-in', 'Rough-in', '03-16', '03-21', '03-15', '03-20'],
  ['Rough inspection', 'Rough-in', '03-23', null, '03-20', null],
  ['Drywall and paint', 'Rough-in', '03-23', '03-31', '03-20', '03-28'],
  ['Cabinets', 'Finishes', '03-31', '04-05', '03-28', '04-02'],
  ['Countertops', 'Finishes', '04-05', '04-08', '04-02', '04-05'],
  ['Tile backsplash', 'Finishes', '04-08', '04-12', '04-05', '04-09'],
  ['Fixtures and appliances', 'Finishes', '04-12', '04-16', '04-09', '04-13'],
  ['Final walkthrough', 'Finishes', '04-17', null, '04-14', null],
].map(([name, phase, start, end, plannedStart, plannedEnd]) => ({
  name: name as string,
  phase: phase as string,
  start: `2026-${start}`,
  end: end ? `2026-${end}` : undefined,
  plannedStart: `2026-${plannedStart}`,
  plannedEnd: plannedEnd ? `2026-${plannedEnd}` : undefined,
}))

// Wide enough for the names left of the bars (the default card is under 480 px of content).
const ARTBOARD: CSSProperties = { maxWidth: 720 }

function Remodel({ style = ARTBOARD }: { style?: CSSProperties }) {
  return (
    <article className="card card-wide" style={style}>
      <header className="card-header">
        <h2 className="card-title">Kitchen remodel</h2>
        <span className="card-meta">Mar–Apr</span>
      </header>
      <GanttChart
        data={remodel}
        x="name"
        start="start"
        end="end"
        group="phase"
        baselineStart="plannedStart"
        baselineEnd="plannedEnd"
        now="2026-03-27"
        title="Kitchen remodel"
        description="Schedule against the plan. Demolition and plumbing ran over; both milestones are three days late."
      />
    </article>
  )
}

const meta = {
  title: 'Charts/GanttChart',
  component: Remodel,
} satisfies Meta<typeof Remodel>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }

// The remodel with the chart 360 px wide (card padding 28 on each side): names above the bars.
export const Narrow: Story = {
  parameters: { theme: 'light' },
  args: { style: { maxWidth: 416 } },
}

// Defaults only: no theme of its own, `x`, `start` and `end`. Without `now` every task is done.
const deck = [
  { task: 'Permits', from: '2026-05-04', to: '2026-05-15' },
  { task: 'Footings', from: '2026-05-18', to: '2026-05-21' },
  { task: 'Framing', from: '2026-05-21', to: '2026-05-29' },
  { task: 'Decking', from: '2026-06-01', to: '2026-06-06' },
  { task: 'Railings', from: '2026-06-08', to: '2026-06-12' },
  { task: 'Stain and seal', from: '2026-06-15', to: '2026-06-17' },
]

export const Plain: Story = {
  render: () => (
    <article className="card card-wide" style={ARTBOARD}>
      <GanttChart data={deck} x="task" start="from" end="to" title="Deck build" />
    </article>
  ),
}

// A `progress` field on each row, no `now` and no baseline: the done share splits each bar.
const office = [
  { step: 'Pick the space', from: '2026-01-05', to: '2026-01-23', done: 1 },
  { step: 'Sign the lease', from: '2026-01-26', to: '2026-02-06', done: 1 },
  { step: 'Network and power', from: '2026-02-09', to: '2026-03-06', done: 0.6 },
  { step: 'Furniture order', from: '2026-02-16', to: '2026-03-13', done: 0.25 },
  { step: 'Packing', from: '2026-03-09', to: '2026-03-20', done: 0 },
  { step: 'Move day', from: '2026-03-21', to: '2026-03-23', done: 0 },
]

export const Progress: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card card-wide" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">Office move</h2>
      </header>
      <GanttChart
        data={office}
        x="step"
        start="from"
        end="to"
        progress="done"
        title="Office move"
        description="Two steps are done; network and furniture are under way."
      />
    </article>
  ),
}

// Twelve tasks over a year in three groups, with today in mid-June.
const year = [
  ['Customer interviews', 'Research', '01-05', '02-13'],
  ['Market sizing', 'Research', '01-19', '02-27'],
  ['Pricing study', 'Research', '02-16', '03-27'],
  ['Prototype', 'Build', '03-02', '04-24'],
  ['Pilot with two crews', 'Build', '04-20', '06-05'],
  ['Mobile app', 'Build', '05-04', '08-14'],
  ['Billing', 'Build', '06-01', '08-28'],
  ['Hardening', 'Build', '08-17', '10-02'],
  ['Website', 'Launch', '07-06', '09-18'],
  ['Training videos', 'Launch', '09-07', '10-30'],
  ['Partner program', 'Launch', '10-05', '12-04'],
  ['Launch campaign', 'Launch', '10-19', '12-18'],
].map(([task, stream, from, to]) => ({
  task: task as string,
  stream: stream as string,
  from: `2026-${from}`,
  to: `2026-${to}`,
}))

export const Months: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card card-wide" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">Year plan</h2>
        <span className="card-meta">2026</span>
      </header>
      <GanttChart
        data={year}
        x="task"
        start="from"
        end="to"
        group="stream"
        now="2026-06-15"
        title="Year plan"
        description="Research is done, build is under way, launch starts in July."
      />
    </article>
  ),
}

// Three milestones against their plan: design sign-off on time, the inspection two days early
// (its label starts after the baseline diamond to its right), opening day four days late on the
// schedule's last day (the axis ends there; the label keeps its place in the gutter).
const shop = [
  ['Design sign-off', '09-04', null, '09-04', null],
  ['Strip-out', '09-07', '09-11', '09-07', '09-11'],
  ['Electrical', '09-14', '09-23', '09-14', '09-22'],
  ['Inspection passed', '09-24', null, '09-26', null],
  ['Fit-out', '09-24', '10-07', '09-25', '10-06'],
  ['Opening day', '10-11', null, '10-07', null],
].map(([step, from, to, plannedFrom, plannedTo]) => ({
  step: step as string,
  from: `2026-${from}`,
  to: to ? `2026-${to}` : undefined,
  plannedFrom: `2026-${plannedFrom}`,
  plannedTo: plannedTo ? `2026-${plannedTo}` : undefined,
}))

export const Milestones: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card card-wide" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">Shop fit-out</h2>
        <span className="card-meta">Sep–Oct</span>
      </header>
      <GanttChart
        data={shop}
        x="step"
        start="from"
        end="to"
        baselineStart="plannedFrom"
        baselineEnd="plannedTo"
        now="2026-09-25"
        title="Shop fit-out"
        description="Design sign-off was on time and the inspection two days early; opening day is four days late."
      />
    </article>
  ),
}
