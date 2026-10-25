'use client'

import { useState } from 'react'
import { Heatmap, type HeatmapCell } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'heatmap/trial-conversion',
  title: 'Trial-to-paid conversion by channel and plan',
  rscSafe: false,
} satisfies ExampleMeta

const plans = ['Starter', 'Pro', 'Team', 'Enterprise']
// Percent of trials that became paid. Events has no Starter trials: that cell is missing.
const rates: Record<string, (number | null)[]> = {
  Search: [4.1, 6.8, 9.2, 11.5],
  Referral: [5.3, 8.4, 12.7, 14.9],
  Newsletter: [3.2, 5.1, 7.4, 6.0],
  Social: [1.8, 2.6, 3.1, 2.2],
  Events: [null, 7.9, 10.8, 18.3],
}
const data = Object.entries(rates).flatMap(([channel, values]) =>
  values.flatMap((rate, i) => (rate === null ? [] : [{ channel, plan: plans[i] ?? '', rate }])),
)

// 'use client': `onSelect` is a function and the selected cell is state.
export default function TrialConversion() {
  const [selected, setSelected] = useState<HeatmapCell<(typeof data)[number]> | null>(null)
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <Heatmap
        title={meta.title}
        description="Events convert best on Enterprise at 18.3%; Social never passes 3.1%."
        data={data}
        row="channel"
        column="plan"
        value="rate"
        columns={plans}
        // Rates do not add up, so the totals are off.
        totals={false}
        breaks={[3, 6, 10]}
        format={{ preset: 'percent', digits: 1 }}
        tone="accent"
        onSelect={(_id, cell) => setSelected(cell)}
      />
      <p aria-live="polite" style={{ margin: 0 }}>
        {selected
          ? `Selected: ${selected.row}, ${selected.column}, ${selected.value.toFixed(1)}%`
          : 'Select a cell to read it here.'}
      </p>
    </div>
  )
}
