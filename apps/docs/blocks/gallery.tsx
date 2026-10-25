import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { LazyMount } from '../app/_components/lazy-mount'
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

/**
 * Height reserved for the dashboard of a tile until it mounts (px). The nine dashboards are
 * 490 to 2220 px tall in a one-column tile (375 px wide), most of them around 1650 px, so this
 * is the typical one. A tile mounts below the viewport, so a different final height moves only
 * what is further down.
 */
const TILE_CHART_HEIGHT = 1600

/** Server component: a tile per item, with the live chart of its `exampleId`, mounted near the viewport. */
export async function Gallery({ heading, lede, items }: GalleryProps) {
  const loaded = await loadExamples(items.map((item) => item.exampleId))
  if (!loaded.ok) return loaded.error
  const charts = loaded.charts.map((chart, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the same example may appear twice; the position is the identity
    <LazyMount key={i} minHeight={TILE_CHART_HEIGHT}>
      {chart}
    </LazyMount>
  ))
  return <GalleryView heading={heading} lede={lede} items={items} charts={charts} />
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
