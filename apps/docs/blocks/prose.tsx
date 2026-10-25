import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { Markdown } from './markdown'

export const proseSchema = z.object({
  markdown: z.string().meta({ fieldType: 'textarea' }),
})

export type ProseProps = z.infer<typeof proseSchema>

export function Prose({ markdown }: ProseProps) {
  return (
    <div className="prose">
      <Markdown>{markdown}</Markdown>
    </div>
  )
}

export const proseBlock = defineBlock({
  type: 'prose',
  label: 'Prose',
  category: 'content',
  icon: 'text',
  description: 'Markdown text (GFM). Raw HTML is ignored.',
  defaultProps: { markdown: 'Write some **markdown** here.' },
  propsSchema: proseSchema,
  component: Prose,
})
