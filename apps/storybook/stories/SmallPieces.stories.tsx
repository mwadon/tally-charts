import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, DotCount, fmt, InlineBar, ShareBar, thresholds, ZoneMeter } from 'tally-charts'

// Table margin cells (02), job counts (05), change pills (01, 05, 06, 07), and parts of a whole and zones (09).
const margins = [6.1, 7.7, 8.8, 12.3, 16.4, 19.8, 22.0]

const zoneTones = ['gain', 'warn', 'loss'] as const
const zoneLabels = ['Good', 'Needs improvement', 'Poor']
const lcpZones = thresholds([2.5, 4], [...zoneTones], zoneLabels)
const clsZones = thresholds([0.1, 0.25], [...zoneTones], zoneLabels)
const inpZones = thresholds([200, 500], [...zoneTones], zoneLabels)
const seconds = (v: number) => `${v.toFixed(1)} s`

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
      <section aria-label="Parts of a whole" className="piece-grid">
        <ShareBar
          label="Where visitors come from"
          segments={[
            { label: 'Internal links', value: 2711, tone: 'gain' },
            { label: 'Search', value: 1968, tone: 'accent' },
            { label: 'Direct', value: 1101, tone: 'warn' },
            { label: 'Social', value: 43, tone: 'neutral', fill: 'hatch' },
          ]}
        />
        <ShareBar
          label="Pages by review state"
          total={800}
          legendValue="percent"
          segments={[{ label: 'Reviewed in the last 90 days', value: 62 }]}
        />
        <ShareBar
          label="Devices"
          legend={false}
          segments={[
            { label: 'Mobile', value: 79, tone: 'warn' },
            { label: 'Desktop', value: 20, tone: 'accent' },
            { label: 'Tablet', value: 1, tone: 'gain' },
          ]}
        />
      </section>
      <section aria-label="Zones" className="piece-grid">
        <ZoneMeter
          label="Largest Contentful Paint"
          value={4.1}
          zones={lcpZones}
          max={6}
          maxLabel="6 s+"
          format={seconds}
        />
        <ZoneMeter
          label="Cumulative Layout Shift"
          value={0}
          zones={clsZones}
          max={0.4}
          maxLabel="0.4+"
          format={{ preset: 'number', digits: 2 }}
        />
        <ZoneMeter
          label="Interaction to Next Paint"
          value={950}
          zones={inpZones}
          max={800}
          maxLabel="800+"
        />
        <ZoneMeter label="No data yet" value={Number.NaN} zones={inpZones} max={800} />
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
