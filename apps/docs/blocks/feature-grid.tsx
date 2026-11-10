import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { FeatureGrid } from './home-views'

export const featureGridSchema = z.object({
  heading: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        text: z.string().min(1),
        href: z.string().min(1).optional(),
        linkLabel: z.string().min(1).optional(),
      }),
    )
    .min(1)
    .meta({ fieldType: 'array' }),
})

export type FeatureGridBlockProps = z.infer<typeof featureGridSchema>

export const featureGridBlock = defineBlock({
  type: 'feature-grid',
  label: 'Feature grid',
  category: 'home',
  icon: 'grid-2x2',
  description: 'A heading and a grid of cards with a title, a sentence and an optional link each.',
  defaultProps: {
    heading: 'Built for real dashboards',
    items: [
      { title: 'Accessible by default', text: 'Keyboard navigation and screen reader support.' },
    ],
  },
  propsSchema: featureGridSchema,
  component: FeatureGrid,
})
