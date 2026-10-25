'use client'

import {
  Bars,
  Chart,
  DataTable,
  Dots,
  RowDividers,
  RowLabels,
  Tooltip,
  useChart,
} from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/rows-and-custom-marks',
  title: 'Hours logged against plan, by team',
  rscSafe: false,
} satisfies ExampleMeta

interface TeamRow {
  team: string
  lead: string
  actual: number
  plan: number
}

const teams: TeamRow[] = [
  { team: 'Platform', lead: 'Ines', actual: 412, plan: 380 },
  { team: 'Payments', lead: 'Marek', actual: 355, plan: 360 },
  { team: 'Growth', lead: 'Aiko', actual: 298, plan: 340 },
  { team: 'Data', lead: 'Tomás', actual: 276, plan: 250 },
  { team: 'Support', lead: 'Priya', actual: 190, plan: 220 },
]

// The plan marker sits at a pixel position that depends on the chart's scales, which only exist
// inside <Chart>. Reading them takes the useChart() hook, and a hook cannot run in a Server
// Component, so this file starts with 'use client' (the reference compositions do the same).
function PlanMarkers({ rows }: { rows: readonly TeamRow[] }) {
  const { x, y } = useChart()
  if (x.kind !== 'linear' || y.kind !== 'band') return null
  return (
    <Dots
      radius={4}
      interactive={false}
      dots={rows.flatMap((row) => {
        const top = y.scale(row.team)
        if (top === undefined) return []
        return [
          {
            key: row.team,
            id: row.team,
            datum: row,
            cx: x.scale(row.plan),
            cy: top + y.scale.bandwidth() / 2,
            tone: 'neutral' as const,
            label: `${row.team} plan, ${row.plan} hours`,
          },
        ]
      })}
    />
  )
}

export default function RowsAndCustomMarks() {
  return (
    <>
      <Chart
        data={teams}
        x={{ field: 'actual', domain: [0, 450] }}
        y={{ type: 'band', field: 'team', padding: 0.4 }}
        margin={{ top: 8, right: 16, bottom: 8, left: 120 }}
        height={232}
        title={meta.title}
        description="Platform and Data ran over plan; Growth and Support came in under it."
      >
        <RowDividers inset={8} />
        <RowLabels text="team" subtext="lead" inset={8} />
        <Bars id="team" format={{ preset: 'number', digits: 0 }} />
        <PlanMarkers rows={teams} />
        <Tooltip
          content={(point) => {
            const row = point.datum as TeamRow
            return `${row.team}: ${row.actual} h logged, ${row.plan} h planned`
          }}
        />
      </Chart>
      {/* Chart's own `dataTable` prop does the same job; DataTable is the piece it renders. */}
      <DataTable
        data={teams}
        caption="Hours logged against plan, by team"
        columns={[
          { header: 'Team', value: (d) => d.team },
          { header: 'Logged', value: (d) => String(d.actual) },
          { header: 'Planned', value: (d) => String(d.plan) },
        ]}
      />
    </>
  )
}
