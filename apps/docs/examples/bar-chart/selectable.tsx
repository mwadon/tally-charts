'use client'

import { useState } from 'react'
import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'bar-chart/selectable',
  title: 'Orders by region, select a bar',
  rscSafe: false,
} satisfies ExampleMeta

const regions = [
  { region: 'North', orders: 1280 },
  { region: 'South', orders: 940 },
  { region: 'East', orders: 1115 },
  { region: 'West', orders: 1460 },
]

// onSelect is a function prop, so this example needs a client component.
export default function Selectable() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <BarChart
        data={regions}
        x="region"
        y="orders"
        format="number"
        height={240}
        title={meta.title}
        description="West has the most orders, South the fewest."
        onSelect={(id) => setSelected(String(id))}
      />
      <p aria-live="polite">{selected === null ? 'Nothing selected.' : `Selected: ${selected}`}</p>
    </>
  )
}
