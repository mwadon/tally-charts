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
import type { ChartMessages } from './messages'

interface LocaleContextValue {
  locale: string
  currency: string
}

const LocaleContext = /* @__PURE__ */ createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
})

const MessagesContext = /* @__PURE__ */ createContext<Partial<ChartMessages>>({})

export interface ChartsProviderProps {
  locale?: string
  currency?: string
  /**
   * Built-in text such as "No data" or the keyboard hint, in your language. Keys left out keep
   * their English default. A nested provider without this prop inherits its parent's messages; one
   * with it replaces them, and any key it leaves out goes back to English, not to the parent's text.
   * Memoised by object identity, so an inline object re-renders every chart under it on each
   * render of the parent: hoist it or wrap it in `useMemo`. A per-chart prop (`empty`,
   * `keyboardHint`, `targetLabel`, `totalLabel`) wins over these.
   */
  messages?: Partial<ChartMessages>
  children?: ReactNode
}

export function ChartsProvider({
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY,
  messages,
  children,
}: ChartsProviderProps) {
  const value = useMemo(() => ({ locale, currency }), [locale, currency])
  const inherited = useContext(MessagesContext)
  return (
    <LocaleContext.Provider value={value}>
      <MessagesContext.Provider value={messages ?? inherited}>{children}</MessagesContext.Provider>
    </LocaleContext.Provider>
  )
}

/**
 * Internal: the caller's messages as given, without defaults. Read each key as
 * `messages.noData ?? NO_DATA`, so that a bundle holds only the strings it can show.
 */
export function useMessages(): Partial<ChartMessages> {
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
