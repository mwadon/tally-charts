import {
  Axis,
  Bars,
  Chart,
  ComparisonBars,
  Delta,
  DotCount,
  InlineBar,
  Meter,
  RangeMeter,
  RankedBars,
  Stat,
  Target,
  Tooltip,
  ValueLabel,
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
