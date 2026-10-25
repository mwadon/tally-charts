import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { ChartExample } from '../app/_components/chart-example'
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
 * Server component: the example is loaded by id from the registry, so an editor cannot break
 * it. Content saved before an example was renamed can still carry an id that the schema would
 * reject, hence the check here.
 */
export async function ChartExampleBlock({
  exampleId,
  defaultView,
  height,
}: ChartExampleBlockProps) {
  if (!Object.hasOwn(examples, exampleId)) return blockError(`Unknown example: ${exampleId}`)

  const entry = examples[exampleId]
  const { default: Example } = await entry.load()
  const filename = entry.file.slice(entry.file.lastIndexOf('/') + 1)

  return (
    <ChartExample
      title={entry.title}
      preview={<Example />}
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
