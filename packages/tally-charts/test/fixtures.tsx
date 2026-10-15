import {
  Axis,
  Bars,
  BridgeChart,
  Chart,
  ComparisonBars,
  Delta,
  DotCount,
  DotHistogram,
  fmt,
  Heatmap,
  InlineBar,
  LineChart,
  Meter,
  RangeMeter,
  RankedBars,
  RunwayChart,
  runwayForecast,
  Stat,
  StripPlot,
  Target,
  Tooltip,
  thresholds,
  ValueLabel,
  WaffleColumns,
  WaterfallChart,
} from '../src'

export const weeks = [
  { week: 'Jul 6', margin: 37.5 },
  { week: 'Jul 13', margin: 36.9 },
  { week: 'Jul 20', margin: 35.6 },
  { week: 'Jul 27', margin: 37.1 },
  { week: 'Aug 3', margin: 34.9 },
  { week: 'Aug 10', margin: 33.9 },
  { week: 'Aug 17', margin: 35.1 },
  { week: 'Aug 24', margin: 33.7 },
  { week: 'Aug 31', margin: 32.6 },
  { week: 'Sep 7', margin: 35.9 },
  { week: 'Sep 14', margin: 36.6 },
  { week: 'Sep 21', margin: 34.0 },
]

// Mirrors apps/storybook/stories/LastTwelveWeeks.stories.tsx (Task 12); keep the two in sync.
export function LastTwelveWeeks() {
  return (
    <Chart
      data={weeks}
      title="Margin by week, last 12 weeks"
      description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
      height={260}
      margin={{ top: 24, bottom: 28 }}
      x={{ type: 'band', field: 'week', padding: 0.35 }}
      y={{ field: 'margin', domain: [26, 40] }}
    >
      <Target y={38} label="Target 38%" />
      <Bars
        fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')}
        format="percent"
      />
      <ValueLabel at="last" format={(v) => v.toFixed(1)} />
      <Axis side="bottom" ticks="ends" />
      <Tooltip />
    </Chart>
  )
}

export const costLines = [
  { name: 'Labor', note: '7.5 h planned, 12.5 h worked', estimate: 640, actual: 1060 },
  { name: 'Materials', note: 'Line set, refrigerant, pad', estimate: 720, actual: 900 },
  { name: 'Subcontract', note: 'Crane and electrician', estimate: 400, actual: 400 },
]

export function EstimateVsActual() {
  return (
    <ComparisonBars
      data={costLines}
      label="name"
      sublabel="note"
      plan="estimate"
      actual="actual"
      format="currency"
      title="Estimate vs actual"
    />
  )
}

export const causes = [
  { name: 'Labor overruns', amount: 31200 },
  { name: 'Material variance', amount: 18700 },
  { name: 'Callbacks', amount: 14400 },
]

export function DrillColumn() {
  return (
    <RankedBars
      data={causes}
      label="name"
      value="amount"
      format="currency-compact"
      layout="stacked"
      selectedId={0}
      title="Leakage by cause"
    />
  )
}

export function SmallPieces() {
  return (
    <div>
      <Stat value={34} format="percent" delta={<Delta value={-1.2} format="pts" />} />
      <Meter value={34} min={20} max={45} target={38} format="percent" label="Gross margin" />
      <RangeMeter value={12.3} reference={36} max={40} format="percent" label="Margin" />
      <InlineBar value={12.3} max={40} target={38} label="Margin" />
      <DotCount count={29} label="29 jobs" />
    </div>
  )
}

export const gapSteps = [
  { label: 'Labor overruns', value: -1.6, meta: 7700 },
  { label: 'Material variance', value: -1.1, meta: 5300 },
  { label: 'Callbacks', value: -0.7, meta: 3400 },
  { label: 'Discounting', value: -0.4, meta: 1900 },
  { label: 'Other', value: -0.2, meta: 1000 },
]

export function UnderTarget() {
  return (
    <WaterfallChart
      title="Why it is under target"
      start={{ label: 'Target', value: 38 }}
      steps={gapSteps}
      end={{ label: 'Actual' }}
      format="percent"
      domain={[34, 38]}
      stepLabel={(s) => `${fmt.pts(s.value)} · ${fmt.currencyCompact(s.meta ?? 0)}`}
    />
  )
}

export const leakSteps = [
  { label: 'After discount', value: -260, note: 'discount' },
  { label: 'After labor', value: -260, note: 'labor overrun' },
  { label: 'After callback', value: -240, note: 'callback' },
  { label: 'Actual profit', value: -100, note: 'materials' },
]

export function ProfitBridge() {
  return (
    <BridgeChart
      title="Planned $1,260, kept $400"
      start={{ label: 'Planned profit', value: 1260 }}
      steps={leakSteps}
      format="currency"
      callout={[
        { value: '$400', label: 'kept' },
        { value: '12.3%', label: 'margin' },
        { value: '32%', label: 'of plan' },
      ]}
    />
  )
}

export const marginBands = thresholds(
  [10, 25, 38],
  ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'],
)

export const jobs = [3.1, 8.8, 12.3, 14.0, 26.5, 31.2, 39.0, 41.5, 41.9, 47.2].map((margin, i) => ({
  id: 5810 + i,
  margin,
}))

export function JobsHistogram() {
  return (
    <DotHistogram
      title="Jobs by margin"
      data={jobs}
      value="margin"
      id="id"
      label={(d) => `#${d.id}`}
      format="percent"
      toneBy={marginBands}
      domain={[0, 60]}
      target={{ value: 38, label: 'Target 38%' }}
      calloutId={5812}
    />
  )
}

export const installs = [
  { job: 'A', est: 6.0, act: 8.4 },
  { job: 'B', est: 6.1, act: 7.9 },
  { job: 'C', est: 5.8, act: 9.6 },
  { job: 'D', est: 6.3, act: 8.2 },
  { job: 'E', est: 6.1, act: 8.1 },
]

export function InstallsStrip() {
  return (
    <StripPlot
      title="Dallas installs, hours per job"
      data={installs}
      label="job"
      series={[
        { id: 'est', label: 'Estimated', value: 'est', tone: 'accent-soft' },
        { id: 'act', label: 'Actual', value: 'act', tone: 'loss' },
      ]}
      format="hours"
      domain={[4, 12]}
    />
  )
}

export const leakWeeks = [
  { week: 'Aug 3', leaked: 9800, month: 'August' },
  { week: 'Aug 10', leaked: 10200, month: 'August' },
  { week: 'Aug 31', leaked: 10100, month: 'September' },
  { week: 'Sep 7', leaked: 23400, month: 'September' },
]

export function LeakWaffle() {
  return (
    <WaffleColumns
      title="Profit leaked by week"
      data={leakWeeks}
      x="week"
      y="leaked"
      group="month"
      unit={2000}
      format="currency-compact"
    />
  )
}

type OutlookMonth = {
  month: string
  actual: number | null
  path: number | null
  changes: number | null
  low: number | null
  high: number | null
}

export const outlook: OutlookMonth[] = [
  { month: 'Jul', actual: 34.5, path: null, changes: null, low: null, high: null },
  { month: 'Aug', actual: 34.1, path: null, changes: null, low: null, high: null },
  { month: 'Sep', actual: 33.6, path: 33.6, changes: 33.6, low: 33.6, high: 33.6 },
  { month: 'Oct', actual: null, path: 35.2, changes: 36.7, low: 34.1, high: 36.3 },
]

export function MarginOutlook() {
  return (
    <LineChart
      title="Margin outlook"
      data={outlook}
      x="month"
      series={[
        { id: 'actual', label: 'Actual', value: 'actual' },
        {
          id: 'path',
          label: 'Current path',
          value: 'path',
          style: 'forecast',
          tooltipLabel: 'on the current path',
        },
        {
          id: 'changes',
          label: 'With your changes',
          value: 'changes',
          style: 'scenario',
          tooltipLabel: 'with changes',
        },
      ]}
      band={{ low: 'low', high: 'high', label: 'Likely range' }}
      forecastFrom="Oct"
      target={{ value: 38, label: 'Target 38%' }}
      domain={[30, 40]}
      format="percent"
    />
  )
}

export const leakCells = [
  { branch: 'Dallas', cause: 'Labor', amount: 14800 },
  { branch: 'Dallas', cause: 'Materials', amount: 7900 },
  { branch: 'Dallas', cause: 'Callbacks', amount: 6800 },
  { branch: 'Austin', cause: 'Labor', amount: 9200 },
  { branch: 'Austin', cause: 'Materials', amount: 5100 },
  { branch: 'Austin', cause: 'Callbacks', amount: 3900 },
]

export function LeakHeatmap() {
  return (
    <Heatmap
      title="Where it leaks"
      data={leakCells}
      row="branch"
      column="cause"
      value="amount"
      breaks={[4000, 7000, 13000]}
      format="currency-compact"
    />
  )
}

export function UsageRunway() {
  const now = '2026-10-15T02:00:00Z'
  const rows = [
    {
      id: 'pro',
      label: 'Pro plan',
      ...runwayForecast({
        used: 0.85,
        windowStart: '2026-10-09T11:22:00Z',
        resetAt: '2026-10-16T11:22:00Z',
        now,
      }),
    },
    {
      id: 'team',
      label: 'Team seat',
      ...runwayForecast({
        used: 0.48,
        windowStart: '2026-10-09T20:13:00Z',
        resetAt: '2026-10-16T20:13:00Z',
        now,
      }),
    },
    { id: 'starter', label: 'Starter', disconnected: true, status: 'Reconnect to forecast' },
  ]
  return (
    <RunwayChart
      title="Usage runway"
      rows={rows}
      domain={['2026-10-15T00:00:00Z', '2026-10-22T00:00:00Z']}
      now={now}
      initialWidth={900}
      onSelect={() => {}}
      selectedId="pro"
      dataTable
    />
  )
}
