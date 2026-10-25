import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import api from '../api.generated.json'
import { blockError } from './block-error'
import { Markdown } from './markdown'
import { TableRegion } from './table-region'

interface ApiParam {
  name: string
  type: string
  required: boolean
  default: string | null
  description: string
}

interface ApiSymbol {
  name: string
  kind: 'component' | 'function' | 'hook'
  description: string
  props?: ApiParam[]
  params?: ApiParam[]
  returns?: string
}

const symbols = api.symbols as unknown as Record<string, ApiSymbol>

type SymbolName = keyof typeof api.symbols

/** The public symbols of the API model, for the editor's dropdown and for the schema. */
export const apiSymbols = Object.keys(symbols) as [SymbolName, ...SymbolName[]]

export const propsTableSchema = z.object({
  symbol: z.enum(apiSymbols),
})

export type PropsTableProps = z.infer<typeof propsTableSchema>

/** Server component: the table comes from `api.generated.json`, so it is as current as the source. */
export function PropsTable({ symbol }: PropsTableProps) {
  if (!Object.hasOwn(symbols, symbol)) return blockError(`Unknown symbol: ${symbol}`)

  const entry = symbols[symbol] as ApiSymbol
  const isComponent = entry.kind === 'component'
  const rows = (isComponent ? entry.props : entry.params) ?? []
  const noun = isComponent ? 'Props' : 'Parameters'

  return (
    <>
      {rows.length === 0 ? (
        <p>{`${symbol} has no ${noun.toLowerCase()}.`}</p>
      ) : (
        <TableRegion label={`${noun} of ${symbol}`}>
          <table>
            <thead>
              <tr>
                <th scope="col">{isComponent ? 'Name' : 'Parameter'}</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Required</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row">
                    <code>{row.name}</code>
                  </th>
                  <td>
                    <code>{row.type}</code>
                  </td>
                  <td>{row.default === null ? '—' : <code>{row.default}</code>}</td>
                  <td>{row.required ? 'Yes' : 'No'}</td>
                  <td>{row.description === '' ? '—' : <Markdown>{row.description}</Markdown>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
      )}
      {entry.returns ? (
        <p>
          Returns <code>{entry.returns}</code>
        </p>
      ) : null}
    </>
  )
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
