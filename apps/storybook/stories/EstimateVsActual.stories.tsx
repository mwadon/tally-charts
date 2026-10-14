import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComparisonBars, Legend } from 'tally-charts'

// docs/reference/03-estimate-vs-actual.png, card "Estimate vs actual".
const lines = [
  { name: 'Labor', note: '7.5 h planned, 12.5 h worked', estimate: 640, actual: 1060 },
  { name: 'Materials', note: 'Line set, refrigerant, pad', estimate: 720, actual: 900 },
  { name: 'Subcontract', note: 'Crane and electrician', estimate: 400, actual: 400 },
  { name: 'Permit and disposal', note: 'City permit, old unit haul', estimate: 210, actual: 210 },
  { name: 'Warranty reserve', note: 'Standard 2%', estimate: 150, actual: 150 },
  { name: 'Vehicle and fuel', note: '2 trips', estimate: 120, actual: 120 },
]

function EstimateVsActual() {
  return (
    <article className="card card-wide">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Estimate vs actual</h2>
        <span className="card-meta">Quoted Sep 12 by Dana Whitfield</span>
      </header>
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'Estimate', tone: 'accent-soft', fill: 'hatch' },
            { label: 'Actual', tone: 'accent' },
            { label: 'Over estimate', tone: 'loss', fill: 'hatch' },
          ]}
        />
      </div>
      <ComparisonBars
        data={lines}
        label="name"
        sublabel="note"
        plan="estimate"
        actual="actual"
        format="currency"
        title="Estimate vs actual by cost line"
        description="Labor and materials ran $600 over the estimate; every other line was on plan."
      />
      <div className="total-row">
        <span>Total cost</span>
        <span>
          $2,240 → $2,840 <span className="loss-text">+$600 · 27% over</span>
        </span>
      </div>
    </article>
  )
}

const meta = {
  title: 'Reference/Estimate vs actual',
  component: EstimateVsActual,
} satisfies Meta<typeof EstimateVsActual>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
