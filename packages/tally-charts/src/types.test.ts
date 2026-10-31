import { describe, expect, expectTypeOf, it } from 'vitest'
import { thresholds } from './core/thresholds'
import type {
  BarChartProps,
  BridgeChartProps,
  BridgeStart,
  BridgeStep,
  CalloutProps,
  ChartMessages,
  ChartName,
  ChartPoint,
  ChartProps,
  ComparisonBarsProps,
  DotHistogramProps,
  DotItem,
  HeatmapProps,
  LegendItem,
  LegendProps,
  LinearScaleSpec,
  LineChartProps,
  RankedBarsProps,
  RunwayChartProps,
  StripPlotProps,
  TooltipPillProps,
  TooltipSegment,
  WaffleColumnsProps,
  WaterfallChartProps,
  WaterfallStart,
  WaterfallStep,
  WaterfallTotal,
} from './index'
import { DEFAULT_MESSAGES } from './index'

type Week = { week: string; margin: number }
type Callback = (id: never, point: never) => void
/** The point type the `onSelect` of props `P` receives. */
type Selected<P extends { onSelect?: Callback }> = Parameters<NonNullable<P['onSelect']>>[1]
/** The point type the `onActiveChange` of props `P` receives. */
type Activated<P extends { onActiveChange?: Callback }> = Parameters<
  NonNullable<P['onActiveChange']>
>[1]

describe('public types', () => {
  it('types callback points with the chart data type', () => {
    expectTypeOf<Selected<ChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Activated<ChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week> | null>()
    expectTypeOf<Selected<BarChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<ComparisonBarsProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<RankedBarsProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<DotHistogramProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<StripPlotProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<WaffleColumnsProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Activated<LineChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week> | null>()
    expectTypeOf<Selected<WaterfallChartProps>>().toEqualTypeOf<
      ChartPoint<WaterfallStep | WaterfallStart | WaterfallTotal>
    >()
    expectTypeOf<Selected<BridgeChartProps>>().toEqualTypeOf<ChartPoint<BridgeStep | BridgeStart>>()
    expectTypeOf<ChartPoint['datum']>().toEqualTypeOf<unknown>()
  })

  it('types y2 as linear only and the default messages as read-only', () => {
    expectTypeOf<ChartProps<Week>['y2']>().toEqualTypeOf<LinearScaleSpec<Week> | undefined>()
    expectTypeOf(DEFAULT_MESSAGES).toEqualTypeOf<Readonly<ChartMessages>>()
    // @ts-expect-error The defaults can't be written to.
    const write = () => (DEFAULT_MESSAGES.noData = 'x')
    expect(write).toBeTypeOf('function')
  })

  it('accepts readonly arrays', () => {
    expectTypeOf<LegendProps['items']>().toEqualTypeOf<readonly LegendItem[]>()
    expectTypeOf<TooltipPillProps['segments']>().toEqualTypeOf<readonly TooltipSegment[]>()
    expectTypeOf<CalloutProps['segments']>().toEqualTypeOf<readonly TooltipSegment[] | undefined>()
    expectTypeOf<BridgeChartProps['callout']>().toEqualTypeOf<
      readonly TooltipSegment[] | undefined
    >()
    expectTypeOf<DotItem['segments']>().toEqualTypeOf<readonly TooltipSegment[] | undefined>()
    expectTypeOf<ChartPoint['segments']>().toEqualTypeOf<readonly TooltipSegment[]>()
    const bands = thresholds([10], ['loss', 'gain'], ['Low', 'High'])
    expectTypeOf(bands.bins).toEqualTypeOf<readonly (typeof bands.bins)[number][]>()
    // `as const` data goes straight in.
    const items = [{ label: 'Plan', tone: 'neutral' }] as const satisfies readonly LegendItem[]
    expect(items).toHaveLength(1)
  })
})

/** Identity that checks `value` against the props type `P`, so a missing name is a type error. */
const props = <P>(value: P): P => value

describe('chart name', () => {
  const steps = [{ label: 'Discount', value: -3 }]
  const bars = { data: [] as Week[], x: 'week', y: 'margin' } as const
  const comparison = {
    data: [] as Week[],
    label: 'week',
    plan: 'margin',
    actual: 'margin',
  } as const
  const ranked = { data: [] as Week[], label: 'week', value: 'margin' } as const
  const waterfall = { start: { label: 'Start', value: 10 }, steps } as const
  const histogram = { data: [] as Week[], value: 'margin' } as const
  const strip = {
    data: [] as Week[],
    series: [{ id: 'a', label: 'A', value: 'margin' }],
  } as const
  const waffle = { data: [] as Week[], x: 'week', y: 'margin' } as const
  const line = {
    data: [] as Week[],
    x: 'week',
    series: [{ id: 'a', label: 'A', value: 'margin' }],
  } as const
  const heatmap = {
    data: [] as Week[],
    row: 'week',
    column: 'week',
    value: 'margin',
    breaks: [1],
  } as const
  const runway = { rows: [], domain: [0, 1], now: 0 } as const

  it('requires a title or aria-labelledby on all 12 components', () => {
    // @ts-expect-error a name is required
    props<ChartProps<Week>>({})
    // @ts-expect-error a name is required
    props<BarChartProps<Week>>({ ...bars })
    // @ts-expect-error a name is required
    props<ComparisonBarsProps<Week>>({ ...comparison })
    // @ts-expect-error a name is required
    props<RankedBarsProps<Week>>({ ...ranked })
    // @ts-expect-error a name is required
    props<WaterfallChartProps>({ ...waterfall })
    // @ts-expect-error a name is required
    props<BridgeChartProps>({ ...waterfall })
    // @ts-expect-error a name is required
    props<DotHistogramProps<Week>>({ ...histogram })
    // @ts-expect-error a name is required
    props<StripPlotProps<Week>>({ ...strip })
    // @ts-expect-error a name is required
    props<WaffleColumnsProps<Week>>({ ...waffle })
    // @ts-expect-error a name is required
    props<LineChartProps<Week>>({ ...line })
    // @ts-expect-error a name is required
    props<HeatmapProps<Week>>({ ...heatmap })
    // @ts-expect-error a name is required
    props<RunwayChartProps>({ ...runway })
  })

  it('accepts a title alone on all 12 components', () => {
    const title = 'Margin by week'
    props<ChartProps<Week>>({ title })
    props<BarChartProps<Week>>({ ...bars, title })
    props<ComparisonBarsProps<Week>>({ ...comparison, title })
    props<RankedBarsProps<Week>>({ ...ranked, title })
    props<WaterfallChartProps>({ ...waterfall, title })
    props<BridgeChartProps>({ ...waterfall, title })
    props<DotHistogramProps<Week>>({ ...histogram, title })
    props<StripPlotProps<Week>>({ ...strip, title })
    props<WaffleColumnsProps<Week>>({ ...waffle, title })
    props<LineChartProps<Week>>({ ...line, title })
    props<HeatmapProps<Week>>({ ...heatmap, title })
    props<RunwayChartProps>({ ...runway, title })
  })

  it('accepts aria-labelledby alone on all 12 components', () => {
    const labelledBy = { 'aria-labelledby': 'heading' }
    props<ChartProps<Week>>({ ...labelledBy })
    props<BarChartProps<Week>>({ ...bars, ...labelledBy })
    props<ComparisonBarsProps<Week>>({ ...comparison, ...labelledBy })
    props<RankedBarsProps<Week>>({ ...ranked, ...labelledBy })
    props<WaterfallChartProps>({ ...waterfall, ...labelledBy })
    props<BridgeChartProps>({ ...waterfall, ...labelledBy })
    props<DotHistogramProps<Week>>({ ...histogram, ...labelledBy })
    props<StripPlotProps<Week>>({ ...strip, ...labelledBy })
    props<WaffleColumnsProps<Week>>({ ...waffle, ...labelledBy })
    props<LineChartProps<Week>>({ ...line, ...labelledBy })
    props<HeatmapProps<Week>>({ ...heatmap, ...labelledBy })
    props<RunwayChartProps>({ ...runway, ...labelledBy })
  })

  it('accepts both together, and rejects a title that may be undefined', () => {
    props<BarChartProps<Week>>({ ...bars, title: 'Margin', 'aria-labelledby': 'heading' })
    const maybe = 'Margin' as string | undefined
    // @ts-expect-error `string | undefined` can leave the chart unnamed
    props<BarChartProps<Week>>({ ...bars, title: maybe })
    expectTypeOf<ChartName>().toEqualTypeOf<
      | { title: string; 'aria-labelledby'?: string }
      | { title?: undefined; 'aria-labelledby': string }
    >()
  })
})
