import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { blockError } from './block-error'
import { PropsTableView, type SymbolName, symbols } from './props-table-view'

/** The public symbols of the API model, for the editor's dropdown and for the schema. */
export const apiSymbols = Object.keys(symbols) as [SymbolName, ...SymbolName[]]

export const propsTableSchema = z.object({
  symbol: z.enum(apiSymbols),
})

export type PropsTableProps = z.infer<typeof propsTableSchema>

/** Server component: the table comes from `api.generated.json`, so it is as current as the source. */
export async function PropsTable({ symbol }: PropsTableProps) {
  if (!Object.hasOwn(symbols, symbol)) return await blockError(`Unknown symbol: ${symbol}`)
  return <PropsTableView symbol={symbol} />
}

export const propsTableBlock = defineBlock({
  type: 'props-table',
  label: 'Props table',
  category: 'content',
  icon: 'table',
  description: 'The props or parameters of a component or function, generated from its source.',
  defaultProps: { symbol: 'LineChart' },
  propsSchema: propsTableSchema,
  component: PropsTable,
})
