export type FormatPreset = 'currency' | 'currency-compact' | 'percent' | 'pts' | 'number' | 'hours'
export type FormatSpec = FormatPreset | ((value: number) => string)
export type Formatter = (value: number) => string

export interface LocaleOptions {
  locale?: string
  currency?: string
}

export interface FormatOptions extends LocaleOptions {
  /** Show an explicit `+` on positive values. Defaults to true for `pts`. */
  signed?: boolean
}

export const DEFAULT_LOCALE = 'en-US'
export const DEFAULT_CURRENCY = 'USD'
const MINUS = '−'

interface PresetConfig {
  intl: Intl.NumberFormatOptions
  divisor?: number
  suffix?: string
}

function presetConfig(preset: FormatPreset, currency: string): PresetConfig {
  switch (preset) {
    case 'currency':
      return {
        intl: { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 },
      }
    case 'currency-compact':
      return {
        intl: { style: 'currency', currency, notation: 'compact', maximumSignificantDigits: 3 },
      }
    case 'percent':
      // Values are percentage points: 34 means 34%.
      return {
        intl: { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
        divisor: 100,
      }
    case 'pts':
      return { intl: { minimumFractionDigits: 1, maximumFractionDigits: 1 }, suffix: ' pts' }
    case 'hours':
      return { intl: { maximumFractionDigits: 1 }, suffix: ' h' }
    case 'number':
      return { intl: { maximumFractionDigits: 1 } }
  }
}

export function createFormatter(
  spec: FormatSpec = 'number',
  options: FormatOptions = {},
): Formatter {
  if (typeof spec === 'function') return spec
  const { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = options
  const signed = options.signed ?? spec === 'pts'
  const { intl, divisor = 1, suffix = '' } = presetConfig(spec, currency)
  const nf = new Intl.NumberFormat(locale, { ...intl, signDisplay: signed ? 'exceptZero' : 'auto' })
  return (value) =>
    Number.isFinite(value) ? nf.format(value / divisor).replaceAll('-', MINUS) + suffix : ''
}

export interface Formatters {
  currency: Formatter
  currencyCompact: Formatter
  percent: Formatter
  pts: Formatter
  number: Formatter
  hours: Formatter
}

export function createFormatters(options: LocaleOptions = {}): Formatters {
  return {
    currency: createFormatter('currency', options),
    currencyCompact: createFormatter('currency-compact', options),
    percent: createFormatter('percent', options),
    pts: createFormatter('pts', options),
    number: createFormatter('number', options),
    hours: createFormatter('hours', options),
  }
}

/** Preset formatters with the default locale (`en-US`, USD). */
export const fmt: Formatters = /* @__PURE__ */ createFormatters()
