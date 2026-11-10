import type { CSSProperties } from 'react'
import { BarChart, InlineBar } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/old-colors',
  title: 'The four tones in the 0.9 colors',
  rscSafe: true,
} satisfies ExampleMeta

// The light values of 0.9, set on a wrapper. In your app set them once, after the theme import.
const oldColors = {
  '--ch-accent': '#2f6bf0',
  '--ch-accent-soft': '#9dbcf6',
  '--ch-loss': '#e5368d',
  '--ch-gain': '#22a363',
  display: 'grid',
  gap: '1.5rem',
  maxWidth: '24rem',
} as CSSProperties

const quarters = [
  { q: 'Q1', v: 42 },
  { q: 'Q2', v: 48 },
  { q: 'Q3', v: 53 },
  { q: 'Q4', v: 61 },
]

export default function OldColors() {
  return (
    <div style={oldColors}>
      <BarChart
        data={quarters}
        x="q"
        y="v"
        domain={[0, 70]}
        height={140}
        axis="all"
        title="Revenue by quarter, in the 0.9 accent"
      />
      <InlineBar value={31} max={40} format="percent" label="Actual (accent)" />
      <InlineBar value={36} max={40} format="percent" tone="accent-soft" label="Estimate (soft)" />
      <InlineBar value={12.3} max={40} format="percent" tone="loss" label="Loss" />
      <InlineBar value={24} max={40} format="percent" tone="gain" label="Gain" />
    </div>
  )
}
