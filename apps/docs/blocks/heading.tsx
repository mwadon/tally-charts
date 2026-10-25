import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import type { TocItem } from '../app/_components/toc'

export const headingSchema = z.object({
  text: z.string().min(1),
  // A CMS select: z.enum takes strings only in zod 4, so the level is '2' | '3'.
  level: z.enum(['2', '3']),
  anchor: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .optional(),
})

export type HeadingProps = z.infer<typeof headingSchema>

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The id of the heading element and the target of its table-of-contents entry. */
export function headingId({ anchor, text }: Pick<HeadingProps, 'anchor' | 'text'>): string {
  return anchor ?? (slugify(text) || 'section')
}

export function Heading(props: HeadingProps) {
  const id = headingId(props)
  const Tag = props.level === '2' ? 'h2' : 'h3'
  return (
    <Tag id={id} className="heading">
      {props.text}{' '}
      <a href={`#${id}`} className="heading-anchor" aria-label={`Link to section: ${props.text}`}>
        #
      </a>
    </Tag>
  )
}

interface BlockNode {
  type: string
  props: unknown
  children?: readonly BlockNode[]
}

/** Table-of-contents entries of every valid heading node, in document order, children included. */
export function collectToc(nodes: readonly BlockNode[]): TocItem[] {
  const items: TocItem[] = []
  for (const node of nodes) {
    if (node.type === 'heading') {
      const parsed = headingSchema.safeParse(node.props)
      if (parsed.success) items.push({ id: headingId(parsed.data), label: parsed.data.text })
    }
    if (node.children) items.push(...collectToc(node.children))
  }
  return items
}

export const headingBlock = defineBlock({
  type: 'heading',
  label: 'Heading',
  category: 'content',
  icon: 'heading',
  description: 'A section heading with an anchor link. Feeds the table of contents.',
  defaultProps: { text: 'Section title', level: '2' },
  propsSchema: headingSchema,
  component: Heading,
})
