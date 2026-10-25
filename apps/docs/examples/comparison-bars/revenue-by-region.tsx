'use client'

import { useState } from 'react'
import { ComparisonBars } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'comparison-bars/revenue-by-region',
  title: 'Revenue by region, plan vs actual',
  rscSafe: false,
} satisfies ExampleMeta

const regions = [
  { region: 'North', plan: 48000, actual: 52400 },
  { region: 'South', plan: 36000, actual: 33200 },
  { region: 'East', plan: 41000, actual: 41000 },
  { region: 'West', plan: 52000, actual: 58900 },
]

// onSelect is a function prop, so this example needs a client component.
export default function RevenueByRegion() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <ComparisonBars
        data={regions}
        label="region"
        plan="plan"
        actual="actual"
        id="region"
        good="up"
        format="currency"
        title={meta.title}
        description="West beat its plan by $6,900 and North by $4,400. South fell $2,800 short, and East hit its plan."
        onSelect={(id) => setSelected(String(id))}
      />
      <p aria-live="polite">{selected === null ? 'Nothing selected.' : `Selected: ${selected}`}</p>
    </>
  )
}
