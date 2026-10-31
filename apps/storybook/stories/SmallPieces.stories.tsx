import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Bars,
  Chart,
  Delta,
  DotCount,
  fmt,
  InlineBar,
  Legend,
  ShareBar,
  Sparkline,
  Stat,
  Tooltip,
  thresholds,
  ZoneMeter,
} from 'tally-charts'

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
            <InlineBar
              value={m}
              max={40}
              target={38}
              tone="loss"
              fill="hatch"
              label={`Margin ${fmt.percent(m)}`}
            />
          </div>
        ))}
      </section>
      <section aria-label="Job counts" className="piece-grid">
        <DotCount count={29} tone="loss" label="29 jobs" />
        <DotCount count={17} tone="loss" label="17 jobs" />
        <DotCount count={23} tone="loss" label="23 jobs" />
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

// Narrow container with a 0.1% share and zone, and end labels as wide as the meter allows. Has a
// 320px baseline in e2e/stories.ts; e2e/small-pieces.spec.ts measures the widths at 800px and 320px.
// The long-labels meter has one break (450) that fits between the end labels: with the 200 and 500
// breaks and longer labels, ticks collide with the end labels at 256px (known defect, see
// PROGRESS.md T09.2), and the baseline must not lock that overlap in.
function EdgeCasesStory() {
  return (
    <div className="card piece-grid" style={{ width: '100%', maxWidth: 320 }}>
      <div data-testid="rare-share">
        <ShareBar
          label="Rare share"
          segments={[
            { label: 'Common', value: 999, tone: 'accent' },
            { label: 'Rare', value: 1, tone: 'warn' },
          ]}
        />
      </div>
      <div data-testid="rare-zone">
        <ZoneMeter
          label="Rare zone"
          value={300}
          zones={thresholds([1, 500], [...zoneTones], zoneLabels)}
          max={1000}
          ticks={false}
        />
      </div>
      <div data-testid="long-labels">
        <ZoneMeter
          label="Response time"
          value={350}
          zones={thresholds([450], ['gain', 'loss'], ['Good', 'Poor'])}
          max={1000}
          minLabel="0 ms (fast)"
          maxLabel="Over 1000 ms"
        />
      </div>
      <div data-testid="no-data">
        <ShareBar label="No share data" segments={[{ label: 'Unknown', value: Number.NaN }]} />
        <ZoneMeter label="No zone data" value={Number.NaN} zones={inpZones} max={1000} />
      </div>
    </div>
  )
}

// A dark card nested in a light page, so the pieces resolve their tokens under the inner theme.
// Not in STORIES: e2e/nested-theme.spec.ts measures the marker and segments instead of comparing a
// screenshot (a 3px marker is too small for maxDiffPixelRatio to notice).
function NestedDarkStory() {
  return (
    <div
      className="card piece-grid"
      data-ch-theme="dark"
      data-testid="nested-dark"
      style={{ width: 320 }}
    >
      <ShareBar
        label="Where visitors come from"
        segments={[
          { label: 'Search', value: 60, tone: 'accent' },
          { label: 'Direct', value: 30, tone: 'warn' },
          { label: 'Social', value: 10, tone: 'gain' },
        ]}
      />
      <ZoneMeter label="Response time" value={350} zones={inpZones} max={1000} />
    </div>
  )
}

// Sparklines at three container widths: the endpoint must stay round and sit on the line's end.
// e2e/sparkline.spec.ts measures it; the baseline covers the look.
const trend = [212, 240, 228, 265, 301, 288, 320, 344, 331, 372, 398, 421]

function SparklineStory() {
  return (
    <div className="card piece-grid">
      <div style={{ width: 240, maxWidth: '100%' }}>
        <Stat
          label="Clicks"
          value={421}
          delta={<Delta value={12.5} format={{ preset: 'percent', digits: 1 }} />}
        />
        <Sparkline
          values={trend}
          label="Clicks, last 12 days"
          tone="gain"
          area
          endpoint
          height={36}
        />
      </div>
      {[120, 240, 400].map((w) => (
        <div key={w} data-testid={`sparkline-${w}`} style={{ width: w, maxWidth: '100%' }}>
          <span className="piece-label">Clicks, {w}px wide</span>
          <Sparkline values={trend} label={`Clicks at ${w}px`} tone="gain" area endpoint />
        </div>
      ))}
      <div style={{ width: 240, maxWidth: '100%' }}>
        <span className="piece-label">Refunds, a gap and a target</span>
        <Sparkline
          values={[14, 12, 15, 11, null, 9, 10, 8, 9, 7, 8, 6]}
          label="Refunds with a gap"
          tone="loss"
          endpoint
          target={10}
          domain={[0, 16]}
          height={40}
        />
      </div>
      <div style={{ width: 240, maxWidth: '100%' }}>
        <span className="piece-label">Flat</span>
        <Sparkline values={[5, 5, 5, 5]} label="Flat" endpoint />
      </div>
      <div style={{ width: 240, maxWidth: '100%' }}>
        <span className="piece-label">No data yet</span>
        <Sparkline values={[null, null]} label="Nothing yet" />
      </div>
    </div>
  )
}

// `color` on a share bar, a legend and solid bars. A forced-colors e2e checks that system colors win.
const channels = [
  { label: 'Search', value: 5120, tone: 'accent', color: '#4285f4' },
  { label: 'Social', value: 2380, tone: 'accent-soft', color: '#e1306c' },
  { label: 'Email', value: 1460, tone: 'warn', color: 'var(--ch-gain)' },
  { label: 'Ads', value: 980, tone: 'neutral', fill: 'hatch', color: '#fc0' },
] as const

function ColorsStory() {
  return (
    <div className="card piece-grid">
      <ShareBar label="Visits by source" segments={channels} />
      <Legend
        items={channels.map((c) => ({ label: c.label, tone: c.tone, color: c.color }))}
        shape="dot"
      />
      <Chart
        data={channels}
        x={{ type: 'band', field: 'label', padding: 0.3 }}
        y={{ field: 'value' }}
        height={160}
        title="Visits by source"
        animate={false}
      >
        <Bars<(typeof channels)[number]> id="label" tone="accent" color={(d) => d.color} />
        <Tooltip />
      </Chart>
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

export const Sparklines: Story = { render: () => <SparklineStory /> }

export const Colors: Story = { render: () => <ColorsStory /> }

export const EdgeCases: Story = { render: () => <EdgeCasesStory /> }

export const NestedDark: Story = {
  parameters: { theme: 'light' },
  render: () => <NestedDarkStory />,
}
