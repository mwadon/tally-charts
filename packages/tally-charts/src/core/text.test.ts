import { describe, expect, it } from 'vitest'
import { truncateLabel } from './text'

describe('truncateLabel', () => {
  it('keeps text that fits', () => {
    expect(truncateLabel('Labor', 70)).toBe('Labor')
  })

  it('cuts long text to the width and ends it with an ellipsis', () => {
    // 70px / 7px per character = 10 characters including the ellipsis.
    expect(truncateLabel('Materials and supplies', 70)).toBe('Materials…')
  })

  it('drops trailing spaces before the ellipsis', () => {
    expect(truncateLabel('Labor and parts', 49)).toBe('Labor…')
  })

  it('returns an ellipsis or nothing when there is almost no room', () => {
    expect(truncateLabel('Labor', 10)).toBe('…')
    expect(truncateLabel('Labor', 0)).toBe('')
    expect(truncateLabel('Labor', Number.NaN)).toBe('')
  })
})
