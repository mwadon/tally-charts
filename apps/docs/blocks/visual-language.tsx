import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { LazyMount } from '../app/_components/lazy-mount'
import { exampleIds } from './chart-example'
import { VisualLanguageView } from './home-views'
import { loadExamples } from './load-example'

export const visualLanguageSchema = z.object({
  heading: z.string().min(1),
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

/** Height reserved for the mini chart of a card until it mounts (px): the mini charts are 140 px tall at every width. */
const CARD_CHART_HEIGHT = 140

/** Server component: a section with a heading and one card per item, with the chart of its `exampleId`, mounted near the viewport. */
export async function VisualLanguage({ heading, items }: VisualLanguageProps) {
  const loaded = await loadExamples(items.map((item) => item.exampleId))
  if (!loaded.ok) return loaded.error
  const charts = loaded.charts.map((chart, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: editors may repeat an example; the position is the identity
    <LazyMount key={i} minHeight={CARD_CHART_HEIGHT}>
      {chart}
    </LazyMount>
  ))
  return <VisualLanguageView heading={heading} items={items} charts={charts} />
}

export const visualLanguageBlock = defineBlock({
  type: 'visual-language',
  label: 'Visual language',
  category: 'home',
  icon: 'palette',
  description: 'Cards that each explain one rule of the look, with a live mini chart.',
  defaultProps: {
    heading: 'A visual language that reads at a glance',
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
