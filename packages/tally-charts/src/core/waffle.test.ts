import { describe, expect, it } from 'vitest'
import { packWaffle } from './waffle'

describe('packWaffle', () => {
  it('fills each column bottom-up, two dots across', () => {
    const { cells, maxRows } = packWaffle([3, 0, 5, null, -2, 2.6])
    expect(cells.filter((c) => c.column === 0).map((c) => [c.col, c.row])).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ])
    expect(cells.filter((c) => c.column === 2)).toHaveLength(5)
    expect(cells.filter((c) => c.column === 5)).toHaveLength(3)
    expect(cells.filter((c) => [1, 3, 4].includes(c.column))).toHaveLength(0)
    expect(maxRows).toBe(3)
  })

  it('honours a different width and ignores a bad one', () => {
    expect(packWaffle([6], 3).maxRows).toBe(2)
    expect(packWaffle([6], Number.NaN).maxRows).toBe(3)
  })
})
