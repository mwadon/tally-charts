import { describe, expect, it } from 'vitest'
import * as core from './core'
import * as main from './index'

describe('public entry points', () => {
  it.each([
    'Chart',
    'useChart',
    'ChartsProvider',
    'useFormat',
    'useRegisterPoints',
    'Bars',
    'Axis',
    'Target',
    'ValueLabel',
    'Tooltip',
    'TooltipPill',
    'Legend',
    'fmt',
    'createFormatter',
    'TONES',
    'BarChart',
    'ComparisonBars',
    'RankedBars',
    'RunwayChart',
    'RowLabels',
    'RowDividers',
    'DataTable',
    'Stat',
    'Delta',
    'Meter',
    'RangeMeter',
    'InlineBar',
    'DotCount',
    'ShareBar',
    'ZoneMeter',
    'Sparkline',
    'WaterfallChart',
    'BridgeChart',
    'Connector',
    'ColumnHighlight',
    'Area',
    'Callout',
    'DotHistogram',
    'StripPlot',
    'WaffleColumns',
    'Dots',
    'NearestPointer',
    'thresholds',
    'heatmapLevel',
    'LineChart',
    'Heatmap',
    'Line',
    'Band',
    'Grid',
    'Region',
  ])('main exports %s', (name) => {
    expect(main).toHaveProperty(name)
  })

  it('keeps tally-charts/core to formatting, date formatting, thresholds, value parsing, the runway forecast and types', () => {
    expect(Object.keys(core).sort()).toEqual([
      'DEFAULT_CURRENCY',
      'DEFAULT_LOCALE',
      'TONES',
      'createDateFormatter',
      'createFormatter',
      'createFormatters',
      'fmt',
      'heatmapLevel',
      'runwayForecast',
      'thresholds',
      'toNumber',
      'toTime',
    ])
  })

  it('formats dates through createDateFormatter from tally-charts/core', () => {
    const jan15 = Date.UTC(2026, 0, 15)
    expect(core.createDateFormatter('month', { locale: 'en-US' })(jan15)).toBe('Jan 2026')
    expect(core.createDateFormatter('day')(jan15)).toBe('Jan 15, 2026')
    expect(core.createDateFormatter('month')(Number.NaN)).toBe('')
  })
})
