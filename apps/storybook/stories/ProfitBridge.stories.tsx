import type { Meta, StoryObj } from '@storybook/react-vite'
import { BridgeChart, Legend } from 'tally-charts'

// docs/reference/04-profit-bridge.png, card "Planned $1,260, kept $400".
const leaks = [
  { label: 'After discount', value: -260, note: 'discount' },
  { label: 'After labor', value: -260, note: 'labor overrun' },
  { label: 'After callback', value: -240, note: 'callback' },
  { label: 'Actual profit', value: -100, note: 'materials' },
]

function ProfitBridge() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">Planned $1,260, kept $400</h2>
          <span className="card-meta">$860 of planned profit leaked in four places</span>
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
  )
}

const meta = {
  title: 'Reference/Profit bridge',
  component: ProfitBridge,
} satisfies Meta<typeof ProfitBridge>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
