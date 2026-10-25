export type FormatPreset = 'currency' | 'currency-compact' | 'percent' | 'pts' | 'number' | 'hours'
/** A preset with options, resolved with the `ChartsProvider` locale and currency. */
export interface FormatPresetSpec {
  preset: FormatPreset
  /**
   * Fraction digits, a whole number from 0 to 20: exact for currency, percent and pts; the most
   * shown for number, hours and currency-compact. Default: the preset's own.
   */
  digits?: number
  /** Show `+` on positive values. Default: true for pts, false otherwise. */
  signed?: boolean
}

export type FormatSpec = FormatPreset | FormatPresetSpec | ((value: number) => string)
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

/** `digits` fixed for currency, percent and pts; a maximum for the others. */
function presetConfig(preset: FormatPreset, currency: string, digits?: number): PresetConfig {
  const exact = (d: number) => ({ minimumFractionDigits: d, maximumFractionDigits: d })
  switch (preset) {
    case 'currency':
      return { intl: { style: 'currency', currency, ...exact(digits ?? 0) } }
    case 'currency-compact':
      return {
        intl: {
          style: 'currency',
          currency,
          notation: 'compact',
          ...(digits === undefined
            ? { maximumSignificantDigits: 3 }
            : { maximumFractionDigits: digits }),
        },
      }
    case 'percent':
      // Values are percentage points: 34 means 34%.
      return { intl: { style: 'percent', ...exact(digits ?? 1) }, divisor: 100 }
    case 'pts':
      return { intl: exact(digits ?? 1), suffix: ' pts' }
    case 'hours':
      return { intl: { maximumFractionDigits: digits ?? 1 }, suffix: ' h' }
    case 'number':
      return { intl: { maximumFractionDigits: digits ?? 1 } }
  }
}

/** Whole numbers 0–20 only; anything else falls back to the preset's digits instead of throwing. */
function validDigits(digits: number | undefined): number | undefined {
  return digits !== undefined && Number.isInteger(digits) && digits >= 0 && digits <= 20
    ? digits
    : undefined
}

/**
 * A formatter for numbers: one of the presets, `{ preset, digits, signed }` or your own function.
 *
 * @param spec - What to write: a preset name (`'currency'`, `'currency-compact'`, `'percent'`,
 * `'pts'`, `'number'`, `'hours'`), an object with `preset`, `digits` and `signed`, or a function,
 * which is returned as is. Default: `'number'`.
 * @param options - `locale` (default `en-US`), `currency` (default `USD`) and `signed`, which
 * shows a plus sign for positive values and wins over the spec.
 * @returns A function from a number to text. It returns an empty string for a value that is not
 * finite.
 */
export function createFormatter(
  spec: FormatSpec = 'number',
  options: FormatOptions = {},
): Formatter {
  if (typeof spec === 'function') return spec
  const { preset, digits, signed: specSigned } = typeof spec === 'string' ? { preset: spec } : spec
  const { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = options
  // A component that needs a sign (Delta, step changes) passes `signed`; it wins over the spec.
  const signed = options.signed ?? specSigned ?? preset === 'pts'
  const { intl, divisor = 1, suffix = '' } = presetConfig(preset, currency, validDigits(digits))
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
