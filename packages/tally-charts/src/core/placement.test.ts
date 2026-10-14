import { describe, expect, it } from 'vitest'
import { placeTooltip } from './placement'

const base = { width: 80, height: 24, minX: 0, maxX: 300, minY: 0, offset: 10 }

describe('placeTooltip', () => {
  it('centres above the point', () => {
    expect(placeTooltip({ ...base, x: 150, y: 100 })).toEqual({
      left: 110,
      top: 66,
      placement: 'top',
    })
  })

  it('clamps to the chart edges', () => {
    expect(placeTooltip({ ...base, x: 10, y: 100 }).left).toBe(0)
    expect(placeTooltip({ ...base, x: 295, y: 100 }).left).toBe(220)
  })

  it('flips below when there is no room above', () => {
    expect(placeTooltip({ ...base, x: 150, y: 20 })).toMatchObject({ top: 30, placement: 'bottom' })
  })

  it('pins to the left edge when wider than the chart', () => {
    expect(placeTooltip({ ...base, width: 400, x: 150, y: 100 }).left).toBe(0)
  })
})
