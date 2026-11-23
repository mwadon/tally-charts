import { GanttChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'gantt-chart/schedule-vs-baseline',
  title: 'Kitchen remodel',
  rscSafe: true,
} satisfies ExampleMeta

// A fictional kitchen remodel against its plan, all dates in 2026. A row without an `end` is a
// milestone. With `now` on Mar 27 six tasks are done, "Drywall and paint" is halfway and four are
// planned; Demolition and Plumbing rough-in ran over their baselines.
const tasks = [
  {
    name: 'Site protection',
    phase: 'Prep',
    start: '2026-03-02',
    end: '2026-03-04',
    plannedStart: '2026-03-02',
    plannedEnd: '2026-03-04',
  },
  {
    name: 'Demolition',
    phase: 'Prep',
    start: '2026-03-04',
    end: '2026-03-09',
    plannedStart: '2026-03-04',
    plannedEnd: '2026-03-08',
  },
  {
    name: 'Haul-away',
    phase: 'Prep',
    start: '2026-03-09',
    end: '2026-03-10',
    plannedStart: '2026-03-08',
    plannedEnd: '2026-03-09',
  },
  {
    name: 'Framing changes',
    phase: 'Rough-in',
    start: '2026-03-10',
    end: '2026-03-14',
    plannedStart: '2026-03-09',
    plannedEnd: '2026-03-13',
  },
  {
    name: 'Plumbing rough-in',
    phase: 'Rough-in',
    start: '2026-03-14',
    end: '2026-03-21',
    plannedStart: '2026-03-13',
    plannedEnd: '2026-03-18',
  },
  {
    name: 'Electrical rough-in',
    phase: 'Rough-in',
    start: '2026-03-16',
    end: '2026-03-21',
    plannedStart: '2026-03-15',
    plannedEnd: '2026-03-20',
  },
  { name: 'Rough inspection', phase: 'Rough-in', start: '2026-03-23', plannedStart: '2026-03-20' },
  {
    name: 'Drywall and paint',
    phase: 'Rough-in',
    start: '2026-03-23',
    end: '2026-03-31',
    plannedStart: '2026-03-20',
    plannedEnd: '2026-03-28',
  },
  {
    name: 'Cabinets',
    phase: 'Finishes',
    start: '2026-03-31',
    end: '2026-04-05',
    plannedStart: '2026-03-28',
    plannedEnd: '2026-04-02',
  },
  {
    name: 'Countertops',
    phase: 'Finishes',
    start: '2026-04-05',
    end: '2026-04-08',
    plannedStart: '2026-04-02',
    plannedEnd: '2026-04-05',
  },
  {
    name: 'Tile backsplash',
    phase: 'Finishes',
    start: '2026-04-08',
    end: '2026-04-12',
    plannedStart: '2026-04-05',
    plannedEnd: '2026-04-09',
  },
  {
    name: 'Fixtures and appliances',
    phase: 'Finishes',
    start: '2026-04-12',
    end: '2026-04-16',
    plannedStart: '2026-04-09',
    plannedEnd: '2026-04-13',
  },
  { name: 'Final walkthrough', phase: 'Finishes', start: '2026-04-17', plannedStart: '2026-04-14' },
]

// Field names and literal dates only: the page is a server component. `end` is an instant, so
// "Site protection" covers March 2 and 3.
export default function ScheduleVsBaseline() {
  return (
    <GanttChart
      data={tasks}
      x="name"
      start="start"
      end="end"
      group="phase"
      baselineStart="plannedStart"
      baselineEnd="plannedEnd"
      now="2026-03-27"
      title={meta.title}
      description="Schedule against the plan. Demolition and plumbing ran over; both milestones are three days late."
    />
  )
}
