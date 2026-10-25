import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { getContentSource } from '../lib/content'
import { LinkRowView } from './home-views'

export const linkRowSchema = z.object({
  heading: z.string().min(1),
  items: z
    .array(z.object({ label: z.string().min(1), href: z.string().min(1) }))
    .min(1)
    .meta({ fieldType: 'array' }),
})

export type LinkRowProps = z.infer<typeof linkRowSchema>

/**
 * Server component: a link to `/docs/<slug>` whose navigation entry has `available: false`
 * would be a 404, so it is rendered disabled. Other slugs and external links stay links.
 */
export async function LinkRow({ heading, items }: LinkRowProps) {
  const { groups } = await getContentSource().getNavigation()
  const unavailable = new Set(
    groups.flatMap((group) => group.items.filter((item) => !item.available).map((i) => i.slug)),
  )
  return <LinkRowView heading={heading} items={items} unavailable={unavailable} />
}

export const linkRowBlock = defineBlock({
  type: 'link-row',
  label: 'Link row',
  category: 'home',
  icon: 'link',
  description:
    'A heading and a row of links; links to docs pages that do not exist yet are disabled.',
  defaultProps: {
    heading: 'Keep going',
    items: [{ label: 'GitHub', href: 'https://github.com/' }],
  },
  propsSchema: linkRowSchema,
  component: LinkRow,
})
