import { ComparisonBars, Delta, Legend, RangeMeter, RankedBars, Stat } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/03-estimate-vs-actual',
  title: 'Estimate vs actual: cost lines, result and where the profit went',
  rscSafe: true,
} satisfies ExampleMeta

const lines = [
  { name: 'Labor', note: '7.5 h planned, 12.5 h worked', estimate: 640, actual: 1060 },
  { name: 'Materials', note: 'Line set, refrigerant, pad', estimate: 720, actual: 900 },
  { name: 'Subcontract', note: 'Crane and electrician', estimate: 400, actual: 400 },
  { name: 'Permit and disposal', note: 'City permit, old unit haul', estimate: 210, actual: 210 },
  { name: 'Warranty reserve', note: 'Standard 2%', estimate: 150, actual: 150 },
  { name: 'Vehicle and fuel', note: '2 trips', estimate: 120, actual: 120 },
]

const leaks = [
  { name: 'Discount', amount: -260 },
  { name: 'Labor overrun', amount: -260 },
  { name: 'Callback', amount: -240 },
  { name: 'Materials', amount: -100 },
]

// Props stay serializable (no functions): the page is a server component.
export default function EstimateVsActual() {
  return (
    <div className="ref-dashboard">
      <article className="ref-card">
        <header className="ref-card-header ref-card-header-stack">
          <h2 className="ref-card-title">Result</h2>
          <span className="ref-card-meta">Contract target 35%</span>
        </header>
        <Stat
          value={12.3}
          format="percent"
          delta={<Delta value={-23.7} format="pts" />}
          caption="vs 36.0% estimated"
        />
        <div style={{ marginTop: 28 }}>
          <RangeMeter
            value={12.3}
            reference={36}
            max={40}
            format="percent"
            tone="loss"
            referenceTone="accent"
            label="Margin, actual against estimated"
            valueLabel="Actual 12.3%"
            referenceLabel="Estimated 36.0%"
          />
        </div>
        <dl className="ref-stat-rows">
          <div>
            <dt>Revenue</dt>
            <dd>
              $3,240 <span className="ref-muted">quoted $3,500</span>
            </dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd>
              $2,840 <span className="ref-muted">estimated $2,240</span>
            </dd>
          </div>
          <div>
            <dt>Gross profit</dt>
            <dd>
              $400 <span className="ref-muted">planned $1,260</span>
            </dd>
          </div>
        </dl>
        <h3 className="ref-section-title">Where the $860 went</h3>
        <RankedBars
          data={leaks}
          label="name"
          value="amount"
          format="currency"
          tone="loss"
          // The reference hatches these bars; RankedBars is solid by default.
          fill="hatch"
          title="Where the $860 went"
          description="Discount and labor overrun each cost $260."
        />
      </article>

      <article className="ref-card ref-card-wide">
        <header className="ref-card-header ref-card-header-stack">
          <h2 className="ref-card-title">Estimate vs actual</h2>
          <span className="ref-card-meta">Quoted Sep 12 by Dana Whitfield</span>
        </header>
        <div className="ref-legend-gap">
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
        <div className="ref-total-row">
          <span>Total cost</span>
          <span>
            $2,240 → $2,840 <span className="ref-loss-text">+$600 · 27% over</span>
          </span>
        </div>
      </article>
    </div>
  )
}
