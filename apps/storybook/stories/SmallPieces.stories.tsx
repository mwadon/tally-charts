import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, DotCount, fmt, InlineBar } from 'tally-charts'

// Table margin cells (02), job counts (05) and change pills (01, 05, 06, 07).
const margins = [6.1, 7.7, 8.8, 12.3, 16.4, 19.8, 22.0]

function SmallPieces() {
  return (
    <div className="card piece-grid">
      <section aria-label="Margin cells" className="piece-grid">
        {margins.map((m) => (
          <div key={m} className="piece-row">
            <span className="piece-label">{fmt.percent(m)}</span>
            <InlineBar value={m} max={40} target={38} label={`Margin ${fmt.percent(m)}`} />
          </div>
        ))}
      </section>
      <section aria-label="Job counts" className="piece-grid">
        <DotCount count={29} label="29 jobs" />
        <DotCount count={17} label="17 jobs" />
        <DotCount count={23} label="23 jobs" />
      </section>
      <section aria-label="Changes" className="piece-row">
        <Delta value={6.2} format="percent" />
        <Delta value={-1.2} format="pts" />
        <Delta value={34} format="percent" good="down" signed />
        <Delta value={0} format="percent" />
      </section>
    </div>
  )
}

const meta = {
  title: 'Primitives/Small pieces',
  component: SmallPieces,
} satisfies Meta<typeof SmallPieces>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
