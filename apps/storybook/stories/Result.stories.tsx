import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, RangeMeter, RankedBars, Stat } from 'tally-charts'

// docs/reference/03-estimate-vs-actual.png, card "Result" with "Where the $860 went".
const leaks = [
  { name: 'Discount', amount: -260 },
  { name: 'Labor overrun', amount: -260 },
  { name: 'Callback', amount: -240 },
  { name: 'Materials', amount: -100 },
]

function Result() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Result</h2>
        <span className="card-meta">Contract target 35%</span>
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
      <dl className="stat-rows">
        <div>
          <dt>Revenue</dt>
          <dd>
            $3,240 <span className="muted">quoted $3,500</span>
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>
            $2,840 <span className="muted">estimated $2,240</span>
          </dd>
        </div>
        <div>
          <dt>Gross profit</dt>
          <dd>
            $400 <span className="muted">planned $1,260</span>
          </dd>
        </div>
      </dl>
      <h3 className="section-title">Where the $860 went</h3>
      <RankedBars
        data={leaks}
        label="name"
        value="amount"
        format="currency"
        tone="loss"
        // The reference (03-estimate-vs-actual.png) hatches these bars.
        fill="hatch"
        title="Where the $860 went"
        description="Discount and labor overrun each cost $260."
      />
    </article>
  )
}

const meta = { title: 'Reference/Result', component: Result } satisfies Meta<typeof Result>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
