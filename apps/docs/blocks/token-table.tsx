import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { TOKEN_GROUPS, TOKENS } from '../tokens.generated'
import { TableRegion } from './table-region'

export const tokenTableSchema = z.object({
  group: z.enum(TOKEN_GROUPS).optional(),
})

export type TokenTableProps = z.infer<typeof tokenTableSchema>

const HEX = /^#[0-9a-f]{6}$/i

/** A value in monospace, with a swatch of its color when it is a hex color. */
function TokenValue({ value }: { value: string }) {
  return (
    <span className="token-value">
      {HEX.test(value) ? (
        <span className="token-swatch" aria-hidden="true" style={{ background: value }} />
      ) : null}
      <code>{value}</code>
    </span>
  )
}

/** The `--ch-*` tokens of the theme with their light and dark values, from `TOKENS`. */
export function TokenTable({ group }: TokenTableProps) {
  const tokens = group === undefined ? TOKENS : TOKENS.filter((token) => token.group === group)

  return (
    <TableRegion label={group === undefined ? 'Tokens' : `Tokens: ${group}`}>
      <table>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Light</th>
            <th scope="col">Dark</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.name}>
              <th scope="row">
                <code>{token.name}</code>
              </th>
              <td>
                <TokenValue value={token.light} />
              </td>
              <td>
                <TokenValue value={token.dark} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableRegion>
  )
}

export const tokenTableBlock = defineBlock({
  type: 'token-table',
  label: 'Token table',
  category: 'content',
  icon: 'table',
  description: 'The --ch-* design tokens with their light and dark values.',
  defaultProps: {},
  propsSchema: tokenTableSchema,
  component: TokenTable,
})
