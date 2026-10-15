import { describe, expect, expectTypeOf, it } from 'vitest'
import { thresholds } from './core/thresholds'
import type {
  BarChartProps,
  BridgeChartProps,
  BridgeStart,
  BridgeStep,
  CalloutProps,
  ChartPoint,
  ChartProps,
  ComparisonBarsProps,
  DotHistogramProps,
  DotItem,
  LegendItem,
  LegendProps,
  LineChartProps,
  RankedBarsProps,
  StripPlotProps,
  TooltipPillProps,
  TooltipSegment,
  WaffleColumnsProps,
  WaterfallChartProps,
  WaterfallStart,
  WaterfallStep,
  WaterfallTotal,
} from './index'

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
