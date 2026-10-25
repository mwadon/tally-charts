'use client'

import { useMemo } from 'react'
import {
  Axis,
  Chart,
  type ChartPoint,
  ChartsProvider,
  Grid,
  NearestPointer,
  Tooltip,
  useChart,
  useFormat,
  useRegisterPoints,
} from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'hooks-and-providers/custom-mark',
  title: 'Average order value by month, as lollipops',
  rscSafe: false,
} satisfies ExampleMeta

interface Order {
  month: string
  value: number
}

const orders: Order[] = [
  { month: 'Jan', value: 48 },
  { month: 'Feb', value: 52 },
  { month: 'Mar', value: 61 },
  { month: 'Apr', value: 57 },
  { month: 'May', value: 68 },
  { month: 'Jun', value: 74 },
]

// A custom mark is a component inside <Chart>. Three hooks do the work:
// - useChart() gives the scales and the size, so the mark can place itself;
// - useFormat() formats numbers in the ChartsProvider's locale and currency;
// - useRegisterPoints() hands the chart the mark's points, so hover, the arrow keys, the tooltip
//   and the screen-reader announcements work on it.
// Hooks cannot run in a Server Component, hence 'use client'.
function Lollipops({ rows }: { rows: readonly Order[] }) {
  const { x, y, activeId } = useChart()
  const { create } = useFormat()

  // Memoize: the chart re-registers points whenever the array identity changes.
  const points = useMemo<ChartPoint<Order>[]>(() => {
    if (x.kind !== 'point' || y.kind !== 'linear') return []
    const money = create({ preset: 'currency', digits: 0 })
    return rows.flatMap((row, index) => {
      const px = x.scale(row.month)
      if (px === undefined) return []
      const text = money(row.value)
      return [
        {
          id: row.month,
          index,
          datum: row,
          x: px,
          y: y.scale(row.value),
          label: `${row.month}, ${text}`,
          segments: [{ value: row.month }, { value: text, tone: 'accent' as const }],
        },
      ]
    })
  }, [rows, x, y, create])

  useRegisterPoints(points)

  if (x.kind !== 'point' || y.kind !== 'linear') return null
  const base = y.scale(0)
  return (
    <g>
      {points.map((p) => {
        const active = p.id === activeId
        return (
          <g key={p.id}>
            <line x1={p.x} x2={p.x} y1={base} y2={p.y} stroke="var(--ch-accent)" strokeWidth={2} />
            <circle
              cx={p.x}
              cy={p.y}
              r={active ? 7 : 5}
              fill="var(--ch-accent)"
              stroke="var(--ch-surface)"
              strokeWidth={2}
            />
          </g>
        )
      })}
    </g>
  )
}

export default function CustomMark() {
  return (
    <ChartsProvider locale="en-GB" currency="GBP">
      <Chart
        data={orders}
        x={{ type: 'point', field: 'month' }}
        y={{ field: 'value', domain: [0, 80] }}
        margin={{ left: 44, right: 24 }}
        height={260}
        title={meta.title}
        description="Average order value rose from £48 in January to £74 in June."
      >
        <Grid ticks={4} />
        <Lollipops rows={orders} />
        <Axis side="left" ticks={4} format={{ preset: 'currency', digits: 0 }} />
        <Axis side="bottom" />
        <NearestPointer axis="x" radius={32} />
        <Tooltip />
      </Chart>
    </ChartsProvider>
  )
}
