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
  ])('main exports %s', (name) => {
    expect(main).toHaveProperty(name)
  })

  it.each([
    'createScale',
    'linearScale',
    'bandTicks',
    'thinTicks',
    'computeBars',
    'placeTooltip',
    'createFormatters',
    'createWarner',
    'truncateLabel',
    'runningTotals',
    'areaPath',
    'thresholds',
    'binDots',
    'stackStrip',
    'medianOf',
    'packWaffle',
  ])('core exports %s', (name) => {
    expect(core).toHaveProperty(name)
  })
})
