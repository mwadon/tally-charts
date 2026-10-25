'use client'

import {
  Area,
  Axis,
  Band,
  Chart,
  Dots,
  Grid,
  Line,
  NearestPointer,
  Region,
  Tooltip,
  useChart,
} from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/line-area-band',
  title: 'Monthly revenue with a forecast range',
  rscSafe: false,
} satisfies ExampleMeta

const months = [
  { month: 'Jan', revenue: 410, low: 410, high: 410 },
  { month: 'Feb', revenue: 455, low: 455, high: 455 },
  { month: 'Mar', revenue: 498, low: 498, high: 498 },
  { month: 'Apr', revenue: 530, low: 530, high: 530 },
  { month: 'May', revenue: 590, low: 590, high: 590 },
  { month: 'Jun', revenue: 640, low: 640, high: 640 },
  { month: 'Jul', revenue: 700, low: 660, high: 740 },
  { month: 'Aug', revenue: 745, low: 690, high: 800 },
  { month: 'Sep', revenue: 790, low: 720, high: 860 },
  { month: 'Oct', revenue: 850, low: 760, high: 940 },
]

// Line draws a path but registers no points, so nothing can be hovered or reached with the
// arrow keys. Dots takes pixel positions, which only exist inside the chart, so this component
// reads the scales with useChart(). A hook cannot run in a Server Component, hence 'use client'
// at the top of the file (the reference compositions do the same).
function RevenueDots({ rows }: { rows: typeof months }) {
  const { x, y } = useChart()
  if (x.kind !== 'point' || y.kind !== 'linear') return null
  return (
    <Dots
      radius={4}
      dots={rows.flatMap((row, index) => {
        const cx = x.scale(row.month)
        if (cx === undefined) return []
        return [
          {
            key: row.month,
            id: row.month,
            datum: row,
            cx,
            cy: y.scale(row.revenue),
            tone: 'accent' as const,
            soft: index >= 6,
            label: `${row.month}, ${row.revenue}k`,
            segments: [{ value: row.month }, { value: `${row.revenue}k` }],
          },
        ]
      })}
    />
  )
}

export default function LineAreaBand() {
  return (
    <Chart
      data={months}
      x={{ type: 'point', field: 'month' }}
      y={{ field: 'revenue', domain: [300, 1000] }}
      margin={{ left: 44 }}
      height={280}
      title={meta.title}
      description="Revenue grew from 410k to 640k over six months; the forecast range reaches 760k to 940k in October."
    >
      <Region from="Jul" />
      <Grid ticks={5} />
      <Band data={months.slice(5)} low="low" high="high" tone="accent-soft" />
      <Area y="revenue" opacity={0.18} />
      <Line y="revenue" dots="none" />
      <RevenueDots rows={months} />
      <Axis side="left" ticks={5} />
      <Axis side="bottom" />
      <NearestPointer axis="x" radius={32} />
      <Tooltip />
    </Chart>
  )
}
