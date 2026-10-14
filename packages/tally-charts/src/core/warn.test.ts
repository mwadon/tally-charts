import { describe, expect, it, vi } from 'vitest'
import { createWarner, isDev } from './warn'

describe('createWarner', () => {
  it('is in development mode under vitest', () => {
    expect(isDev).toBe(true)
  })

  it('warns once per key with the library prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const warn = createWarner()
    warn('k', 'first')
    warn('k', 'again')
    warn('other', 'second')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, '[tally-charts] first')
    expect(spy).toHaveBeenNthCalledWith(2, '[tally-charts] second')
  })

  it('keeps separate memory per warner', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createWarner()('k', 'one')
    createWarner()('k', 'two')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
