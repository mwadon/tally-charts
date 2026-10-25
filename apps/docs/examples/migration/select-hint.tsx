'use client'

import { useState } from 'react'
import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/select-hint',
  title: 'Orders by region, select a bar',
  rscSafe: false,
} satisfies ExampleMeta

const regions = [
  { region: 'North', orders: 1280 },
  { region: 'South', orders: 940 },
  { region: 'East', orders: 1115 },
  { region: 'West', orders: 1460 },
]

// With onSelect the keyboard hint ends with "Press Enter to select." A point with
// `selectable: false` never promises Enter. Without onSelect the sentence is not there.
export default function SelectHint() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <BarChart
        data={regions}
        x="region"
        y="orders"
        format="number"
        height={220}
        title={meta.title}
        onSelect={(id) => setSelected(String(id))}
      />
      <p aria-live="polite">{selected === null ? 'Nothing selected.' : `Selected: ${selected}`}</p>
    </>
  )
}
