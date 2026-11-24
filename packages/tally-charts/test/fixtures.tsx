import {
  Axis,
  Bars,
  BridgeChart,
  Chart,
  ComparisonBars,
  Delta,
  DonutChart,
  DotCount,
  DotHistogram,
  FunnelChart,
  fmt,
  GanttChart,
  GroupedBarChart,
  Heatmap,
  InlineBar,
  LineChart,
  Meter,
  RangeMeter,
  RankedBars,
  RunwayChart,
  runwayForecast,
  ScatterChart,
  ShareBar,
  StackedAreaChart,
  StackedBarChart,
  Stat,
  StripPlot,
  Target,
  Tooltip,
  Treemap,
  thresholds,
  ValueLabel,
  WaffleColumns,
  WaterfallChart,
  ZoneMeter,
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
      <ShareBar
        label="Visitors"
        segments={[
          { label: 'Search', value: 3 },
          { label: 'Direct', value: 1 },
        ]}
      />
      <ZoneMeter
        label="LCP"
        value={4.1}
        max={6}
        zones={thresholds(
          [2.5, 4],
          ['gain', 'warn', 'loss'],
          ['Good', 'Needs improvement', 'Poor'],
        )}
      />
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

export const crewQuarters = [
  { quarter: 'Q1', north: 42, south: 35, west: 18 },
  { quarter: 'Q2', north: 48, south: 38, west: 27 },
  { quarter: 'Q3', north: 55, south: 36, west: 33 },
  { quarter: 'Q4', north: 61, south: 44, west: 41, forecast: true },
]

export function CrewQuarters() {
  return (
    <GroupedBarChart
      title="Jobs completed by crew"
      data={crewQuarters}
      x="quarter"
      series={[
        { id: 'north', label: 'North', value: 'north' },
        { id: 'south', label: 'South', value: 'south' },
        { id: 'west', label: 'West', value: 'west', tone: 'neutral' },
      ]}
      fill={(d) => (d.forecast ? 'hatch' : undefined)}
      target={{ value: 50, label: 'Target' }}
    />
  )
}

// Totals 51/56/58/66/56/69; Apr and Jun go over the budget of 60.
export const monthlyCost = [
  { month: 'Jan', labor: 24, materials: 18, subcontract: 9 },
  { month: 'Feb', labor: 26, materials: 20, subcontract: 10 },
  { month: 'Mar', labor: 27, materials: 20, subcontract: 11 },
  { month: 'Apr', labor: 28, materials: 21, subcontract: 17 },
  { month: 'May', labor: 27, materials: 19, subcontract: 10 },
  { month: 'Jun', labor: 29, materials: 20, subcontract: 20 },
]

export function MonthlyCost() {
  return (
    <StackedBarChart
      title="Monthly cost against budget"
      data={monthlyCost}
      x="month"
      series={[
        { id: 'labor', label: 'Labor', value: 'labor' },
        { id: 'materials', label: 'Materials', value: 'materials' },
        { id: 'subcontract', label: 'Subcontract', value: 'subcontract' },
      ]}
      target={{ value: 60, over: 'loss' }}
    />
  )
}

const crewInstall = [180, 190, 200, 210, 205, 220, 235, 240, 250, 255, 262, 270]
const crewService = [120, 125, 118, 130, 140, 138, 145, 150, 155, 158, 162, 165]
const crewWarranty = [60, 55, 65, 68, 62, 58, 66, 72, 70, 74, 76, 78]
export const crewHours = crewInstall.map((install, i) => ({
  week: `W${i + 1}`,
  install,
  service: crewService[i] as number,
  warranty: crewWarranty[i] as number,
}))

export function CrewHours() {
  return (
    <StackedAreaChart
      title="Crew hours per week"
      data={crewHours}
      x="week"
      series={[
        { id: 'install', label: 'Install', value: 'install' },
        { id: 'service', label: 'Service', value: 'service' },
        { id: 'warranty', label: 'Warranty', value: 'warranty' },
      ]}
      format={(v) => `${v} h`}
      forecastFrom="W10"
      forecastLabel="today"
    />
  )
}

const jobMargins = (
  [
    ['Alder Court', 8000, 44, 40],
    ['Birch Lane', 12000, 38, 58],
    ['Cedar Row', 15000, 52, 40],
    ['Dune House', 22000, 41, 103],
    ['Elm Terrace', 26000, 35, 79],
    ['Fern Hill', 34000, 46, 103],
    ['Grove Flats', 38000, 33, 160],
    ['Hazel Yard', 48000, 39, 160],
    ['Ivy Works', 60000, 36, 231],
    ['Juniper Mill', 88000, 34, 520],
    ['Kestrel Barn', 18000, 29, 79],
    ['Larch Depot', 30000, 24, 130],
    ['Maple Arcade', 44000, 18, 231],
    ['North Quay', 55000, 27, 271],
    ['Orchard Mews', 74000, 30, 361],
    ['Harbor Lofts', 68000, 12, 410],
  ] as const
).map(([name, estimate, margin, hours]) => ({ name, estimate, margin, hours }))

export function JobMargins() {
  return (
    <ScatterChart
      title="Job size against margin"
      data={jobMargins}
      x="estimate"
      y="margin"
      size="hours"
      label="name"
      xLabel="Estimate"
      yLabel="Margin"
      sizeLabel="Hours"
      xFormat="currency-compact"
      yFormat={(v) => `${v}%`}
      sizeFormat={(v) => `${v} h`}
      tone={(j) => (j.margin < 32 ? 'loss' : 'accent')}
      target={{ value: 32, label: 'target 32%' }}
    />
  )
}

export const leadSteps = [
  { step: 'Leads', count: 1240, referral: 420, website: 380, ads: 300, other: 140 },
  { step: 'Site visits', count: 806, referral: 330, website: 250, ads: 150, other: 76 },
  { step: 'Quotes sent', count: 532, referral: 250, website: 160, ads: 80, other: 42 },
  { step: 'Quotes accepted', count: 298, referral: 170, website: 80, ads: 30, other: 18 },
  { step: 'Jobs paid', count: 262, referral: 155, website: 68, ads: 24, other: 15 },
]

export function LeadFunnel({ initialWidth }: { initialWidth?: number } = {}) {
  return (
    <FunnelChart
      title="From lead to paid job"
      data={leadSteps}
      x="step"
      y="count"
      initialWidth={initialWidth}
    />
  )
}

export function LeadFunnelBySource() {
  return (
    <FunnelChart
      title="From lead to paid job, by source"
      data={leadSteps}
      x="step"
      series={[
        { id: 'referral', label: 'Referral', value: 'referral' },
        { id: 'website', label: 'Website', value: 'website' },
        { id: 'ads', label: 'Ads', value: 'ads' },
        { id: 'other', label: 'Other', value: 'other', tone: 'neutral' },
      ]}
    />
  )
}

export const revenueLines = [
  { line: 'Installs', revenue: 773000 },
  { line: 'Service plans', revenue: 442000 },
  { line: 'Repairs', revenue: 294000 },
  { line: 'Inspections', revenue: 184000 },
  { line: 'Maintenance', revenue: 62000 },
  { line: 'Consulting', revenue: 41000 },
  { line: 'Parts', revenue: 28000 },
  { line: 'Permits', revenue: 16000 },
]

export function RevenueByLine({ initialWidth }: { initialWidth?: number } = {}) {
  return (
    <DonutChart
      title="Revenue by service line"
      data={revenueLines}
      x="line"
      y="revenue"
      format="currency-compact"
      centerLabel="total revenue"
      initialWidth={initialWidth}
    />
  )
}

/** A fictional kitchen remodel: 13 rows in three phases, two of them milestones (no `end`). */
export const remodelTasks: {
  name: string
  phase: string
  start: string
  end?: string
  plannedStart: string
  plannedEnd?: string
}[] = [
  ['Site protection', 'Prep', '03-02', '03-04', '03-02', '03-04'],
  ['Demolition', 'Prep', '03-04', '03-09', '03-04', '03-08'],
  ['Haul-away', 'Prep', '03-09', '03-10', '03-08', '03-09'],
  ['Framing changes', 'Rough-in', '03-10', '03-14', '03-09', '03-13'],
  ['Plumbing rough-in', 'Rough-in', '03-14', '03-21', '03-13', '03-18'],
  ['Electrical rough-in', 'Rough-in', '03-16', '03-21', '03-15', '03-20'],
  ['Rough inspection', 'Rough-in', '03-23', null, '03-20', null],
  ['Drywall and paint', 'Rough-in', '03-23', '03-31', '03-20', '03-28'],
  ['Cabinets', 'Finishes', '03-31', '04-05', '03-28', '04-02'],
  ['Countertops', 'Finishes', '04-05', '04-08', '04-02', '04-05'],
  ['Tile backsplash', 'Finishes', '04-08', '04-12', '04-05', '04-09'],
  ['Fixtures and appliances', 'Finishes', '04-12', '04-16', '04-09', '04-13'],
  ['Final walkthrough', 'Finishes', '04-17', null, '04-14', null],
].map(([name, phase, start, end, plannedStart, plannedEnd]) => ({
  name: name as string,
  phase: phase as string,
  start: `2026-${start}`,
  ...(end ? { end: `2026-${end}` } : {}),
  plannedStart: `2026-${plannedStart}`,
  ...(plannedEnd ? { plannedEnd: `2026-${plannedEnd}` } : {}),
}))

export function RemodelSchedule({ initialWidth }: { initialWidth?: number } = {}) {
  return (
    <GanttChart
      title="Kitchen remodel"
      data={remodelTasks}
      x="name"
      start="start"
      end="end"
      group="phase"
      baselineStart="plannedStart"
      baselineEnd="plannedEnd"
      now="2026-03-27"
      initialWidth={initialWidth}
    />
  )
}

export const serviceLines = [
  { line: 'Kitchen', group: 'Remodels', revenue: 412, margin: 34 },
  { line: 'Bath', group: 'Remodels', revenue: 286, margin: 31 },
  { line: 'Basement', group: 'Remodels', revenue: 148, margin: 22 },
  { line: 'Whole-home', group: 'Remodels', revenue: 96, margin: 8 },
  { line: 'Plumbing', group: 'Repairs', revenue: 188, margin: 42 },
  { line: 'Electrical', group: 'Repairs', revenue: 142, margin: 38 },
  { line: 'Roofing', group: 'Repairs', revenue: 96, margin: 16 },
  { line: 'Handyman', group: 'Repairs', revenue: 54, margin: 18 },
  { line: 'Decks', group: 'Outdoor', revenue: 164, margin: 27 },
  { line: 'Fencing', group: 'Outdoor', revenue: 82, margin: 24 },
  { line: 'Landscaping', group: 'Outdoor', revenue: 48, margin: 12 },
  { line: 'Annual plans', group: 'Maintenance plans', revenue: 86, margin: 46 },
  { line: 'Seasonal', group: 'Maintenance plans', revenue: 38, margin: 41 },
]

export function RevenueTreemap({ initialWidth }: { initialWidth?: number } = {}) {
  return (
    <Treemap
      title="Revenue by service line"
      description="Remodels bring in half the revenue; maintenance plans have the best margin."
      data={serviceLines}
      id="line"
      name="line"
      value="revenue"
      group="group"
      shade="margin"
      breaks={[10, 20, 30, 40]}
      shadeLabel="Gross margin"
      shadeFormat={{ preset: 'percent', digits: 0 }}
      initialWidth={initialWidth}
    />
  )
}
