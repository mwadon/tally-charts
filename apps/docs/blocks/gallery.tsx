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
 * Height reserved for the dashboard of a tile until it mounts, in px: `[one column, two or more
 * columns]`, measured at 375 and 1280 px viewports (tile content 341 and 358 px wide). The
 * dashboards differ from 400 to 2200 px and wrap text differently in a narrower tile, so one
 * value for all would shift the page by up to ~1200 px when a tile mounts. `e2e/lazy-mount.spec.ts`
 * compares every tile before and after the mount at both widths, so a changed dashboard fails
 * there until its pair is updated. Between those widths (tile 340 to 700 px wide) the value is
 * only close, by up to a few dozen px; the margin of `LazyMount` makes that happen off screen.
 */
const TILE_CHART_HEIGHTS: Readonly<Record<string, readonly [number, number]>> = {
  'reference/01-gross-margin-waterfall': [1620, 1577],
  'reference/02-jobs-dot-histogram-table': [403, 403],
  'reference/03-estimate-vs-actual': [1610, 1586],
  'reference/04-profit-bridge': [561, 561],
  'reference/05-leakage-heatmap': [920, 897],
  'reference/06-drilldown-strip-plot': [1567, 1567],
  'reference/07-forecast': [546, 546],
  'reference/08-usage-runway': [2132, 2132],
  'reference/09-performance': [1806, 1737],
}

/** For an example without a measured pair (a new tile): the typical height of a dashboard. */
const DEFAULT_TILE_CHART_HEIGHTS = [1600, 1600] as const

/** Server component: a tile per item, with the live chart of its `exampleId`, mounted near the viewport. */
export async function Gallery({ heading, lede, items }: GalleryProps) {
  const loaded = await loadExamples(items.map((item) => item.exampleId))
  if (!loaded.ok) return loaded.error
  const charts = loaded.charts.map((chart, i) => {
    const [narrow, wide] =
      TILE_CHART_HEIGHTS[items[i]?.exampleId ?? ''] ?? DEFAULT_TILE_CHART_HEIGHTS
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: the same example may appear twice; the position is the identity
      <LazyMount key={i} minHeight={narrow} wideMinHeight={wide}>
        {chart}
      </LazyMount>
    )
  })
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
