import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { exampleIds } from './chart-example'
import { GalleryView } from './home-views'
import { loadExamples } from './load-example'

export const gallerySchema = z.object({
  heading: z.string().min(1),
  lede: z.string().optional(),
  items: z
    .array(
      z.object({
        exampleId: z.enum(exampleIds),
        caption: z.string().optional(),
      }),
    )
    .min(1)
    .meta({ fieldType: 'array' }),
})

export type GalleryProps = z.infer<typeof gallerySchema>

/** Server component: a tile per item, with the live chart of its `exampleId`. */
export async function Gallery({ heading, lede, items }: GalleryProps) {
  const loaded = await loadExamples(items.map((item) => item.exampleId))
  if (!loaded.ok) return loaded.error
  return <GalleryView heading={heading} lede={lede} items={items} charts={loaded.charts} />
}

export const galleryBlock = defineBlock({
  type: 'gallery',
  label: 'Gallery',
  category: 'home',
  icon: 'layout-grid',
  description: 'A grid of live examples from the repo, each with an optional caption.',
  defaultProps: {
    heading: 'Reference dashboards',
    lede: 'Live examples from the repo.',
    items: [{ exampleId: 'bar-chart/margin-by-week', caption: 'Margin by week' }],
  },
  propsSchema: gallerySchema,
  component: Gallery,
})
