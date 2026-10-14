import type { Meta, StoryObj } from '@storybook/react-vite'
import { fmt, WaterfallChart } from 'tally-charts'

// docs/reference/01-gross-margin-waterfall.png, card "Why it is under target".
const steps = [
  { label: 'Labor overruns', value: -1.6, meta: 7700 },
  { label: 'Material variance', value: -1.1, meta: 5300 },
  { label: 'Callbacks', value: -0.7, meta: 3400 },
  { label: 'Discounting', value: -0.4, meta: 1900 },
  { label: 'Other', value: -0.2, meta: 1000 },
]

function WhyUnderTarget() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Why it is under target</h2>
        <span className="card-meta">4.0 points lost against the 38% target</span>
      </header>
      <WaterfallChart
        title="Why margin is under target"
        description="Labor and materials explain two thirds of the 4.0 point gap."
        start={{ label: 'Target', value: 38 }}
        steps={steps}
        end={{ label: 'Actual' }}
        format="percent"
        domain={[34, 38]}
        axisFormat={(v) => `${v}%`}
        stepLabel={(s) => `${fmt.pts(s.value)} · ${fmt.currencyCompact(s.meta)}`}
      />
      <div className="insight">
        <p>Labor and materials explain two thirds of the gap.</p>
        <p className="muted">Both trace back to installs in Dallas.</p>
      </div>
    </article>
  )
}

const meta = {
  title: 'Reference/Why it is under target',
  component: WhyUnderTarget,
} satisfies Meta<typeof WhyUnderTarget>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
