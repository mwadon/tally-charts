import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, Stat, WaffleColumns } from 'tally-charts'

// docs/reference/05-leakage-heatmap.png, card "Profit leaked".
const weeks = [
  { week: 'Aug 3', leaked: 9800, month: 'August' },
  { week: 'Aug 10', leaked: 10200, month: 'August' },
  { week: 'Aug 17', leaked: 9600, month: 'August' },
  { week: 'Aug 24', leaked: 7900, month: 'August' },
  { week: 'Aug 31', leaked: 10100, month: 'September' },
  { week: 'Sep 7', leaked: 23400, month: 'September' },
  { week: 'Sep 14', leaked: 10600, month: 'September' },
  { week: 'Sep 21', leaked: 9400, month: 'September' },
]

function ProfitLeaked() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Profit leaked</h2>
        <span className="card-meta">4.4 pts of margin on $1.86M revenue</span>
      </header>
      <Stat
        value={82400}
        format="currency-compact"
        delta={<Delta value={8300} format="currency-compact" good="down" />}
        caption="vs the same days in August"
      />
      {/* The chart's own top margin holds the peak pill, so no extra space above it. */}
      <div>
        <WaffleColumns
          title="Profit leaked by week"
          description="September leaked more than August; the week of Sep 7 peaked at $23.4K."
          data={weeks}
          x="week"
          y="leaked"
          group="month"
          unit={2000}
          format="currency-compact"
          height={216}
        />
      </div>
    </article>
  )
}

const meta = { title: 'Reference/Profit leaked', component: ProfitLeaked } satisfies Meta<
  typeof ProfitLeaked
>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
