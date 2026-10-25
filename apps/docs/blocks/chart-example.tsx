import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { ChartExample } from '../app/_components/chart-example'
import { LazyMount } from '../app/_components/lazy-mount'
import { type ExampleId, examples } from '../examples.generated'
import { blockError } from './block-error'
import { CodeBlock } from './code-block'

/** The ids of the example registry, for the editor's dropdown and for the schema. */
export const exampleIds = Object.keys(examples) as [ExampleId, ...ExampleId[]]

export const chartExampleSchema = z.object({
  exampleId: z.enum(exampleIds),
  defaultView: z.enum(['preview', 'code']),
  height: z.number().int().min(120).max(1200).optional(),
})

export type ChartExampleBlockProps = z.infer<typeof chartExampleSchema>

/**
 * `eager` is set by `markEagerExamples` on the first card of a page, which stays in the server
 * HTML; the other cards mount their chart near the viewport. It is deliberately not in the
 * schema, so editors, the seed and `check:content` do not know it.
 */
export type ChartExampleProps = ChartExampleBlockProps & { eager?: boolean }

/** Padding of `.chart-example-panel` (1rem) on both sides, in px. */
const PANEL_PADDING = 32

/**
 * Height of the area inside the panel, so the placeholder makes the card as tall as the
 * panel's `min-height` does once the chart is there: the stylesheet's 18rem (box-sizing
 * border-box) minus 2 × 1rem padding, or `height` minus the padding.
 */
const placeholderHeight = (height: number | undefined) =>
  height === undefined ? '16rem' : height - PANEL_PADDING

/**
 * Server component: the example is loaded by id from the registry, so an editor cannot break
 * it. Content saved before an example was renamed can still carry an id that the schema would
 * reject, hence the check here.
 */
export async function ChartExampleBlock({
  exampleId,
  defaultView,
  height,
  eager,
}: ChartExampleProps) {
  if (!Object.hasOwn(examples, exampleId)) return await blockError(`Unknown example: ${exampleId}`)

  const entry = examples[exampleId]
  const { default: Example } = await entry.load()
  const filename = entry.file.slice(entry.file.lastIndexOf('/') + 1)

  return (
    <ChartExample
      title={entry.title}
      preview={
        eager ? (
          <Example />
        ) : (
          <LazyMount minHeight={placeholderHeight(height)}>
            <Example />
          </LazyMount>
        )
      }
      code={await CodeBlock({ code: entry.source, lang: 'tsx', filename })}
      defaultView={defaultView}
      height={height}
    />
  )
}

export const chartExampleBlock = defineBlock({
  type: 'chart-example',
  label: 'Chart example',
  category: 'content',
  icon: 'chart-line',
  description: 'A live example from the repo with its source and a Preview / Code toggle.',
  defaultProps: { exampleId: 'line-chart/revenue-forecast', defaultView: 'preview' },
  propsSchema: chartExampleSchema,
  component: ChartExampleBlock,
})
