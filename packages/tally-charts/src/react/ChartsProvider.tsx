import { createContext, type ReactNode, useContext, useMemo } from 'react'
import {
  createDateFormatter,
  type DateFormatOptions,
  type DateFormatSpec,
  type DateFormatter,
} from '../core/date'
import {
  createFormatter,
  createFormatters,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  type FormatOptions,
  type FormatSpec,
  type Formatter,
  type Formatters,
} from '../core/format'
import { type ChartMessages, DEFAULT_MESSAGES } from './messages'

interface LocaleContextValue {
  locale: string
  currency: string
}

const LocaleContext = /* @__PURE__ */ createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
})

const MessagesContext = /* @__PURE__ */ createContext<ChartMessages>(DEFAULT_MESSAGES)

export interface ChartsProviderProps {
  locale?: string
  currency?: string
  /**
   * Built-in text such as "No data" or the keyboard hint, in your language. Keys left out keep
   * their English default. A nested provider replaces its parent's messages instead of merging.
   * Memoised by object identity, so an inline object re-renders every chart under it on each
   * render of the parent: hoist it or wrap it in `useMemo`. A per-chart prop (`empty`,
   * `keyboardHint`, `targetLabel`, `totalLabel`) wins over these.
   */
  messages?: Partial<ChartMessages>
  children?: ReactNode
}

// A key set to `undefined` keeps its default; a plain spread would let it erase the string.
function withDefaults(messages: Partial<ChartMessages>): ChartMessages {
  const merged: ChartMessages = { ...DEFAULT_MESSAGES }
  for (const key of Object.keys(messages) as (keyof ChartMessages)[]) {
    const value = messages[key]
    if (value !== undefined) merged[key] = value
  }
  return merged
}

export function ChartsProvider({
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY,
  messages,
  children,
}: ChartsProviderProps) {
  const value = useMemo(() => ({ locale, currency }), [locale, currency])
  const merged = useMemo(() => (messages ? withDefaults(messages) : DEFAULT_MESSAGES), [messages])
  return (
    <LocaleContext.Provider value={value}>
      <MessagesContext.Provider value={merged}>{children}</MessagesContext.Provider>
    </LocaleContext.Provider>
  )
}

/** Internal: the provider's messages, or `DEFAULT_MESSAGES` itself without one. */
export function useMessages(): ChartMessages {
  return useContext(MessagesContext)
}

/** Internal: the provider's locale and currency, for formatters that aren't number presets. */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}

export interface UseFormatResult extends Formatters {
  create: (spec?: FormatSpec, options?: Pick<FormatOptions, 'signed'>) => Formatter
  /** A date formatter in the provider's locale. */
  date: (spec?: DateFormatSpec, options?: Omit<DateFormatOptions, 'locale'>) => DateFormatter
}

export function useFormat(): UseFormatResult {
  const { locale, currency } = useContext(LocaleContext)
  return useMemo<UseFormatResult>(
    () => ({
      ...createFormatters({ locale, currency }),
      create: (spec, options) => createFormatter(spec, { locale, currency, ...options }),
      date: (spec, options) => createDateFormatter(spec, { ...options, locale }),
    }),
    [locale, currency],
  )
}
