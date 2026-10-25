import { BridgeChart, Legend } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/04-profit-bridge',
  title: 'Profit bridge: planned $1,260, kept $400',
  rscSafe: true,
} satisfies ExampleMeta

const leaks = [
  { label: 'After discount', value: -260, note: 'discount' },
  { label: 'After labor', value: -260, note: 'labor overrun' },
  { label: 'After callback', value: -240, note: 'callback' },
  { label: 'Actual profit', value: -100, note: 'materials' },
]

// Props stay serializable (no functions): the page is a server component.
export default function ProfitBridge() {
  return (
    <div className="ref-dashboard">
      <article className="ref-card ref-card-wide">
        <header className="ref-card-header-row">
          <div>
            <h2 className="ref-card-title">Planned $1,260, kept $400</h2>
            <span className="ref-card-meta">$860 of planned profit leaked in four places</span>
          </div>
          <Legend
            items={[
              { label: 'Profit left', tone: 'accent', fill: 'hatch' },
              { label: 'Leaked', tone: 'loss', fill: 'hatch' },
              { label: 'Kept', tone: 'accent' },
            ]}
          />
        </header>
        <BridgeChart
          title="Profit from plan to actual"
          description="Planned profit of $1,260 fell to $400 after a discount, labor overrun, callback and materials."
          start={{ label: 'Planned profit', value: 1260 }}
          steps={leaks}
          format="currency"
          height={400}
          callout={[
            { value: '$400', label: 'kept' },
            { value: '12.3%', label: 'margin' },
            { value: '32%', label: 'of plan' },
          ]}
        />
      </article>
    </div>
  )
}
