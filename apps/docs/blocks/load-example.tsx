import type { ReactNode } from 'react'
import { examples } from '../examples.generated'
import { blockError } from './block-error'

/**
 * Server side of the home page blocks that draw charts. An example is loaded by id from the
 * registry; content saved before an example was renamed can still carry an id the schema would
 * reject, so the first unknown id replaces the whole block with `blockError`, as in
 * `ChartExampleBlock`. Returns the error element (`null` on production) as `error` when `ok` is false, otherwise
 * the live charts in the order of `ids`.
 */
export async function loadExamples(
  ids: readonly string[],
): Promise<{ ok: false; error: ReactNode } | { ok: true; charts: ReactNode[] }> {
  const unknown = ids.find((id) => !Object.hasOwn(examples, id))
  if (unknown !== undefined)
    return { ok: false, error: await blockError(`Unknown example: ${unknown}`) }

  const charts = await Promise.all(
    ids.map(async (id) => {
      const { default: Example } = await examples[id as keyof typeof examples].load()
      return <Example key={id} />
    }),
  )
  return { ok: true, charts }
}
