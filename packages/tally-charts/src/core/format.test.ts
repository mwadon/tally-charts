import { describe, expect, it } from 'vitest'
import { createFormatter, type FormatPreset, fmt } from './format'

const norm = (s: string) => s.replace(/\s/g, ' ')

describe('createFormatter (en-US defaults)', () => {
  it.each<[FormatPreset, number, string]>([
    ['currency', 3240, '$3,240'],
    ['currency', -260, '−$260'],
    ['currency-compact', 82400, '$82.4K'],
    ['currency-compact', 1860000, '$1.86M'],
    ['currency-compact', 7700, '$7.7K'],
    ['currency-compact', 860, '$860'],
    ['percent', 34, '34.0%'],
    ['percent', 12.3, '12.3%'],
    ['pts', -1.6, '−1.6 pts'],
    ['pts', 1.5, '+1.5 pts'],
    ['pts', 0, '0.0 pts'],
    ['number', 158, '158'],
    ['number', 1234.56, '1,234.6'],
    ['hours', 7.8, '7.8 h'],
    ['hours', 12, '12 h'],
  ])('%s(%d) → %s', (preset, value, expected) => {
    expect(createFormatter(preset)(value)).toBe(expected)
  })

  it('defaults to the number preset', () => {
    expect(createFormatter()(2.25)).toBe('2.3')
  })

  it('adds an explicit plus sign when signed', () => {
    expect(createFormatter('currency', { signed: true })(420)).toBe('+$420')
  })

  it('returns an empty string for non-finite values', () => {
    expect(createFormatter('percent')(Number.NaN)).toBe('')
  })

  it('passes custom functions through unchanged', () => {
    const custom = (v: number) => `${v}!`
    expect(createFormatter(custom)).toBe(custom)
  })

  it('formats other locales and currencies', () => {
    expect(norm(createFormatter('currency', { locale: 'de-DE', currency: 'EUR' })(3240))).toBe(
      '3.240 €',
    )
    expect(norm(createFormatter('percent', { locale: 'de-DE' })(12.3))).toBe('12,3 %')
  })
})

describe('fmt', () => {
  it('exposes the presets as plain functions', () => {
    expect(fmt.currencyCompact(82400)).toBe('$82.4K')
    expect(fmt.pts(-1.6)).toBe('−1.6 pts')
    expect(fmt.percent(38)).toBe('38.0%')
    expect(fmt.currency(1260)).toBe('$1,260')
    expect(fmt.number(158)).toBe('158')
    expect(fmt.hours(6.1)).toBe('6.1 h')
  })
})

describe('createFormatter with a preset object', () => {
  it('sets the fraction digits', () => {
    expect(createFormatter({ preset: 'percent', digits: 0 })(34)).toBe('34%')
    expect(createFormatter({ preset: 'currency', digits: 2 })(3240.5)).toBe('$3,240.50')
    expect(createFormatter({ preset: 'pts', digits: 2 })(-1.6)).toBe('−1.60 pts')
    expect(createFormatter({ preset: 'number', digits: 0 })(1234.56)).toBe('1,235')
    expect(createFormatter({ preset: 'currency-compact', digits: 0 })(82400)).toBe('$82K')
  })

  it('takes the sign from the object unless the caller sets it', () => {
    expect(createFormatter({ preset: 'pts', signed: false })(1.5)).toBe('1.5 pts')
    expect(createFormatter({ preset: 'currency', signed: true })(420)).toBe('+$420')
    expect(createFormatter({ preset: 'currency', signed: true }, { signed: false })(420)).toBe(
      '$420',
    )
  })

  it('uses the given locale', () => {
    expect(norm(createFormatter({ preset: 'percent', digits: 0 }, { locale: 'de-DE' })(12))).toBe(
      '12 %',
    )
  })

  it('falls back to the preset digits for digits it cannot use, without throwing', () => {
    for (const digits of [-1, 2.5, 21, Number.NaN]) {
      expect(createFormatter({ preset: 'percent', digits })(34)).toBe('34.0%')
    }
  })
})
