import api from '../api.generated.json'
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

export const symbols = api.symbols as unknown as Record<string, ApiSymbol>

export type SymbolName = keyof typeof api.symbols

/**
 * The table of a known `symbol`. Synchronous and free of server-only imports, so the editor
 * registry (client code) can use it too.
 */
export function PropsTableView({ symbol }: { symbol: SymbolName }) {
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
