import type { CSSProperties, ReactNode } from 'react'
import { Axis, Bars, Chart, Grid, Line } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'palettes/vivid',
  title: 'Margin by week, default palette',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', margin: 34, plan: 36, floor: 30 },
  { week: 'W2', margin: 35, plan: 36, floor: 30 },
  { week: 'W3', margin: 31, plan: 37, floor: 30 },
  { week: 'W4', margin: 42, plan: 37, floor: 30 },
  { week: 'W5', margin: 45, plan: 38, floor: 30 },
  { week: 'W6', margin: 39, plan: 38, floor: 30 },
]

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
  gap: '1.5rem',
} satisfies CSSProperties

const panel = {
  background: 'var(--ch-surface)',
  color: 'var(--ch-ink)',
  padding: '1rem',
  borderRadius: 'var(--ch-radius)',
} satisfies CSSProperties

function Margin({ title }: { title: string }): ReactNode {
  return (
    <Chart
      data={weeks}
      x={{ type: 'band', field: 'week', padding: 0.35 }}
      y={{ field: 'margin', domain: [20, 50] }}
      margin={{ left: 36 }}
      height={220}
      title={title}
      description="Margin passed the plan in W4 and peaked at 45% in W5."
    >
      <Grid ticks={3} />
      <Bars id="week" tone="gain" fill="hatch-fade" />
      <Line y="plan" tone="neutral" dashed dots="none" />
      <Line y="floor" tone="warn" dots="none" />
      <Axis side="left" ticks={3} />
      <Axis side="bottom" />
    </Chart>
  )
}

// `data-ch-palette` sits on the same element as `data-ch-theme`, so the palette can never end up
// inside a theme of its own. The palette is light only, so both panels are pinned to light.
// Props stay serializable (no functions): the page is a server component.
export default function Vivid() {
  return (
    <div style={grid}>
      <div data-ch-theme="light" style={panel}>
        <Margin title={meta.title} />
      </div>
      <div data-ch-theme="light" data-ch-palette="vivid" style={panel}>
        <Margin title="Margin by week, vivid palette" />
      </div>
    </div>
  )
}
