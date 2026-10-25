import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { exampleIds } from './chart-example'
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
})

export type HeroProps = z.infer<typeof heroSchema>

/** Server component: the chart is loaded by `exampleId`, text comes from the props. */
export async function Hero({ exampleId, ...rest }: HeroProps) {
  const loaded = await loadExamples([exampleId])
  if (!loaded.ok) return loaded.error
  return <HeroView {...rest} chart={loaded.charts[0]} />
}

export const heroBlock = defineBlock({
  type: 'hero',
  label: 'Hero',
  category: 'home',
  icon: 'sparkles',
  description: 'The opening of the home page: headline, lede, buttons and a live chart.',
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
