'use client'

import {
  Axis,
  Bars,
  Chart,
  Grid,
  Legend,
  Line,
  NearestPointer,
  Tooltip,
  TooltipPill,
} from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'small-pieces/legend-and-tooltip',
  title: 'Orders against plan, by month',
  rscSafe: false,
} satisfies ExampleMeta

interface Month {
  month: string
  orders: number
  plan: number
}

const months: Month[] = [
  { month: 'Jan', orders: 420, plan: 400 },
  { month: 'Feb', orders: 385, plan: 410 },
  { month: 'Mar', orders: 460, plan: 430 },
  { month: 'Apr', orders: 510, plan: 450 },
  { month: 'May', orders: 475, plan: 470 },
  { month: 'Jun', orders: 540, plan: 490 },
]

// `Tooltip content` is a function, so this file is a client file. Legend and TooltipPill are
// plain HTML: Legend sits beside the chart, TooltipPill is what the tooltip shows.
export default function LegendAndTooltip() {
  return (
    <div>
      <Legend
        items={[
          { label: 'Orders', tone: 'accent', shape: 'bar' },
          { label: 'Plan', tone: 'neutral', shape: 'line', dashed: true },
        ]}
      />
      <Chart
        data={months}
        x={{ type: 'band', field: 'month', padding: 0.35 }}
        y={{ field: 'orders', domain: [0, 600] }}
        margin={{ left: 36 }}
        height={260}
        title={meta.title}
        description="Orders beat the plan in every month except February, and reached 540 in June."
      >
        <Grid ticks={4} />
        <Bars id="month" tone="accent" fill="hatch-fade" />
        <Line y="plan" tone="neutral" dashed dots="none" />
        <Axis side="left" ticks={4} />
        <Axis side="bottom" />
        <NearestPointer axis="x" />
        <Tooltip
          content={(point) => {
            const m = point.datum as Month
            const diff = m.orders - m.plan
            return (
              <TooltipPill
                segments={[
                  { value: m.month },
                  { value: m.orders, label: 'orders' },
                  {
                    value: `${diff > 0 ? '+' : ''}${diff}`,
                    label: 'vs plan',
                    tone: diff >= 0 ? 'gain' : 'loss',
                  },
                ]}
              />
            )
          }}
        />
      </Chart>
    </div>
  )
}
