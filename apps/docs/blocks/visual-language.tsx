import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { exampleIds } from './chart-example'
import { VisualLanguageView } from './home-views'
import { loadExamples } from './load-example'

export const visualLanguageSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        text: z.string().min(1),
        exampleId: z.enum(exampleIds),
      }),
    )
    .min(1)
    .meta({ fieldType: 'array' }),
})

export type VisualLanguageProps = z.infer<typeof visualLanguageSchema>

/** Server component: one card per item, with the chart of its `exampleId`. */
export async function VisualLanguage({ items }: VisualLanguageProps) {
  const loaded = await loadExamples(items.map((item) => item.exampleId))
  if (!loaded.ok) return loaded.error
  return <VisualLanguageView items={items} charts={loaded.charts} />
}

export const visualLanguageBlock = defineBlock({
  type: 'visual-language',
  label: 'Visual language',
  category: 'home',
  icon: 'palette',
  description: 'Cards that each explain one rule of the look, with a live mini chart.',
  defaultProps: {
    items: [
      {
        title: 'Hatched is plan',
        text: 'Stripes mark a plan, a forecast or a reference.',
        exampleId: 'visual-language/hatch',
      },
      {
        title: 'Solid is actual',
        text: 'Filled marks are what really happened.',
        exampleId: 'visual-language/solid',
      },
    ],
  },
  propsSchema: visualLanguageSchema,
  component: VisualLanguage,
})
