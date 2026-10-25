'use client'

import { useState } from 'react'
import { RankedBars } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'ranked-bars/pick-a-category',
  title: 'Overruns by category, pick a row',
  rscSafe: false,
} satisfies ExampleMeta

const overruns = [
  { category: 'Labor overruns', amount: 31200 },
  { category: 'Material waste', amount: 18400 },
  { category: 'Rework', amount: 12900 },
  { category: 'Equipment rental', amount: 7600 },
]

// onSelect and selectedId are the pair for a list that filters something else.
export default function PickACategory() {
  const [selected, setSelected] = useState<string | number | null>(null)

  return (
    <>
      <RankedBars
        data={overruns}
        label="category"
        value="amount"
        id="category"
        format="currency-compact"
        selectedId={selected}
        title={meta.title}
        description="Press Enter or Space on a row to select it. Labor overruns lead at $31.2K."
        onSelect={(id) => setSelected((current) => (current === id ? null : id))}
      />
      <p aria-live="polite">{selected === null ? 'Nothing selected.' : `Selected: ${selected}`}</p>
    </>
  )
}
