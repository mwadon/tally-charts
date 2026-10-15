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

interface LocaleContextValue {
  locale: string
  currency: string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
})

export interface ChartsProviderProps {
  locale?: string
  currency?: string
  children?: ReactNode
}

export function ChartsProvider({
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY,
  children,
}: ChartsProviderProps) {
  const value = useMemo(() => ({ locale, currency }), [locale, currency])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
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
