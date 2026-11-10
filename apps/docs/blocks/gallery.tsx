import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { LazyMount } from '../app/_components/lazy-mount'
import { examples } from '../examples.generated'
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
        label: z.string().min(1).optional(),
        caption: z.string().optional(),
      }),
    )
    .min(1)
    .meta({ fieldType: 'array' }),
})

export type GalleryProps = z.infer<typeof gallerySchema>

/**
 * Height reserved for the dashboard of the first tab until it mounts, in px: `[narrow, wide]`,
 * measured at 375 and 1280 px viewports. A dashboard has its narrow layout while its panel is
 * under 900 px wide (`@container ref-tile` in reference.css) and the wide one above, and the two
 * differ by up to ~1500 px. Only the first tab is in the page before a reader picks another, so
 * only its dashboard needs a placeholder, but editors may reorder the items, hence a pair per
 * dashboard. `e2e/lazy-mount.spec.ts` compares the panel before and after the mount at both
 * widths. `LazyMount` switches to the wide value at 764 px, the panel to its wide layout at about
 * 974 px; between the two the reserved height is too small, and the margin of `LazyMount` makes
 * the mount happen off screen.
 */
const TILE_CHART_HEIGHTS: Readonly<Record<string, readonly [number, number]>> = {
  'reference/01-gross-margin-waterfall': [1667, 860],
  'reference/02-jobs-dot-histogram-table': [410, 356],
  'reference/03-estimate-vs-actual': [1624, 1287],
  'reference/04-profit-bridge': [602, 516],
  'reference/05-leakage-heatmap': [934, 812],
  'reference/06-drilldown-strip-plot': [1629, 720],
  'reference/07-forecast': [553, 476],
  'reference/08-usage-runway': [2147, 898],
  'reference/09-performance': [1806, 633],
}

/** For an example without a measured pair (a new tile): the typical height of a dashboard. */
const DEFAULT_TILE_CHART_HEIGHTS = [1600, 800] as const

/** The tab label of an item: its `label`, or the title of its example. */
export function galleryLabel(item: GalleryProps['items'][number]): string {
  return item.label ?? examples[item.exampleId].title
}

/**
 * Server component: a tab per item and the live chart of its `exampleId`. The first chart mounts
 * near the viewport, the others when their tab is chosen.
 */
export async function Gallery({ heading, lede, items }: GalleryProps) {
  const loaded = await loadExamples(items.map((item) => item.exampleId))
  if (!loaded.ok) return loaded.error
  const [narrow, wide] = TILE_CHART_HEIGHTS[items[0]?.exampleId ?? ''] ?? DEFAULT_TILE_CHART_HEIGHTS
  const charts = loaded.charts.map((chart, i) =>
    i === 0 ? (
      <LazyMount key="first" minHeight={narrow} wideMinHeight={wide}>
        {chart}
      </LazyMount>
    ) : (
      chart
    ),
  )
  const tabs = items.map((item) => ({ label: galleryLabel(item), caption: item.caption }))
  return <GalleryView heading={heading} lede={lede} items={tabs} charts={charts} />
}

export const galleryBlock = defineBlock({
  type: 'gallery',
  label: 'Gallery',
  category: 'home',
  icon: 'layout-grid',
  description:
    'Tabs over live examples from the repo, one shown at a time, each with an optional caption.',
  defaultProps: {
    heading: 'Reference dashboards',
    lede: 'Live examples from the repo.',
    items: [{ exampleId: 'bar-chart/margin-by-week', label: 'Margin', caption: 'Margin by week' }],
  },
  propsSchema: gallerySchema,
  component: Gallery,
})
