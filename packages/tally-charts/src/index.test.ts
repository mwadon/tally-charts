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
  ])('core exports %s', (name) => {
    expect(core).toHaveProperty(name)
  })
})
