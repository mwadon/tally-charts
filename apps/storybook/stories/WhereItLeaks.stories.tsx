import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Heatmap, type HeatmapCell, Legend } from 'tally-charts'

// docs/reference/05-leakage-heatmap.png, card "Where it leaks".
const causes = ['Labor', 'Materials', 'Callbacks', 'Discounts', 'Unbilled']
const amounts: Record<string, number[]> = {
  Dallas: [14800, 7900, 6800, 3100, 3600],
  Austin: [9200, 5100, 3900, 4200, 1900],
  Houston: [7200, 5700, 3700, 2500, 2800],
}
const leaks = Object.entries(amounts).flatMap(([branch, values]) =>
  values.map((amount, i) => ({ branch, cause: causes[i] ?? '', amount })),
)
type Leak = (typeof leaks)[number]

const bins = ['Under $4K', '$4K to 7K', '$7K to 13K', '$13K and up']
const binLevels = [1, 2, 4, 5] as const

function WhereItLeaks() {
  const [selected, setSelected] = useState<HeatmapCell<Leak> | null>(null)
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">Where it leaks</h2>
          <span className="card-meta">By branch and cause, September to date</span>
        </div>
        <Legend items={bins.map((label, i) => ({ label, level: binLevels[i] }))} />
      </header>
      <Heatmap
        title="Profit leaked by branch and cause"
        description="Dallas carries 44% of September leakage on 41% of revenue. Labor in Dallas alone is $14.8K."
        data={leaks}
        row="branch"
        column="cause"
        value="amount"
        breaks={[4000, 7000, 13000]}
        binLabels={bins}
        format="currency-compact"
        legend={false}
        onSelect={(_, cell) => setSelected(cell)}
      />
      <p className="card-text">
        Dallas carries 44% of September leakage on 41% of revenue. Labor in Dallas alone is $14.8K.
      </p>
      <output data-testid="heatmap-selected" className="card-text">
        {selected ? `Selected: ${selected.row} · ${selected.column}` : 'Nothing selected'}
      </output>
    </article>
  )
}

const meta = {
  title: 'Reference/Where it leaks',
  component: WhereItLeaks,
} satisfies Meta<typeof WhereItLeaks>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
