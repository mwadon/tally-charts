import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { exampleIds } from './chart-example'
import { CodeBlock } from './code-block'
import { HeroView } from './home-views'
import { loadExamples } from './load-example'

export const heroSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  lede: z.string().min(1).meta({ fieldType: 'textarea' }),
  actions: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1),
        primary: z.boolean().optional(),
      }),
    )
    .meta({ fieldType: 'array' }),
  exampleId: z.enum(exampleIds),
  command: z.string().optional(),
  code: z.string().optional().meta({ fieldType: 'textarea' }),
  codeFilename: z.string().optional(),
  demoHeading: z.string().optional(),
  demoText: z.string().optional().meta({ fieldType: 'textarea' }),
  chartTitle: z.string().optional(),
  chartNote: z.string().optional(),
})

export type HeroProps = z.infer<typeof heroSchema>

/**
 * Server component: the chart is loaded by `exampleId`, text comes from the props. `command` is an
 * install line under the buttons and `code` the snippet shown next to the chart, under
 * `demoHeading` and `demoText`; `chartTitle` and `chartNote` head the chart card. All optional.
 */
export async function Hero({ exampleId, code, codeFilename, ...rest }: HeroProps) {
  const loaded = await loadExamples([exampleId])
  if (!loaded.ok) return loaded.error
  const snippet = code ? await CodeBlock({ code, lang: 'tsx', filename: codeFilename }) : undefined
  return <HeroView {...rest} chart={loaded.charts[0]} code={snippet} />
}

export const heroBlock = defineBlock({
  type: 'hero',
  label: 'Hero',
  category: 'home',
  icon: 'sparkles',
  description:
    'The opening of the home page: headline, lede, buttons, an install command and a live chart with its code.',
  defaultProps: {
    eyebrow: 'React charts',
    title: 'Charts that say what changed',
    lede: 'Bars, lines, waterfalls and runways that say what changed, and whether it is on plan.',
    actions: [{ label: 'Read the docs', href: '/docs/line-chart', primary: true }],
    exampleId: 'bar-chart/margin-by-week',
  },
  propsSchema: heroSchema,
  component: Hero,
})
