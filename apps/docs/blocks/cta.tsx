import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { CtaView } from './home-views'

export const ctaSchema = z.object({
  heading: z.string().min(1),
  text: z.string().optional(),
  command: z.string().optional(),
  action: z.object({ label: z.string().min(1), href: z.string().min(1) }).optional(),
})

export type CtaProps = z.infer<typeof ctaSchema>

export const ctaBlock = defineBlock({
  type: 'cta',
  label: 'Call to action',
  category: 'home',
  icon: 'megaphone',
  description: 'A closing band: a heading, a sentence, an install command and one button.',
  defaultProps: {
    heading: 'Draw your first chart',
    command: 'npm i tally-charts',
    action: { label: 'Getting started', href: '/docs/getting-started' },
  },
  propsSchema: ctaSchema,
  component: CtaView,
})
