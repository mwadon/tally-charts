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
    'RowLabels',
    'RowDividers',
    'DataTable',
    'Stat',
    'Delta',
    'Meter',
    'RangeMeter',
    'InlineBar',
    'DotCount',
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

  it('keeps tally-charts/core to formatting, thresholds, value parsing and types', () => {
    expect(Object.keys(core).sort()).toEqual([
      'DEFAULT_CURRENCY',
      'DEFAULT_LOCALE',
      'TONES',
      'createFormatter',
      'createFormatters',
      'fmt',
      'heatmapLevel',
      'thresholds',
      'toNumber',
      'toTime',
    ])
  })
})
