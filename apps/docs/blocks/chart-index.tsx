import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { thumbNames } from './chart-thumbs'
import { ChartIndexView } from './home-views'

export const chartIndexSchema = z.object({
  heading: z.string().min(1),
  lede: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        text: z.string().min(1),
        href: z.string().min(1),
        thumb: z.enum(thumbNames),
      }),
    )
    .min(1)
    .meta({ fieldType: 'array' }),
})

export type ChartIndexProps = z.infer<typeof chartIndexSchema>

export const chartIndexBlock = defineBlock({
  type: 'chart-index',
  label: 'Chart index',
  category: 'home',
  icon: 'layout-grid',
  description: 'A tile per chart type: a small drawing, the name, one sentence and a link.',
  defaultProps: {
    heading: 'Eleven charts, one grammar',
    items: [
      {
        label: 'BarChart',
        text: 'Values over categories or time',
        href: '/docs/bar-chart',
        thumb: 'bar-chart',
      },
    ],
  },
  propsSchema: chartIndexSchema,
  component: ChartIndexView,
})
