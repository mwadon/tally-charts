import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { Markdown } from './markdown'

export const calloutSchema = z.object({
  tone: z.enum(['info', 'warning', 'tip']),
  markdown: z.string().meta({ fieldType: 'textarea' }),
})

export type CalloutProps = z.infer<typeof calloutSchema>

const toneLabels = { info: 'Note', warning: 'Warning', tip: 'Tip' } as const

export function Callout({ tone, markdown }: CalloutProps) {
  return (
    <aside className="callout" data-tone={tone}>
      <p className="callout-label">{toneLabels[tone]}</p>
      <div className="callout-body">
        <Markdown>{markdown}</Markdown>
      </div>
    </aside>
  )
}

export const calloutBlock = defineBlock({
  type: 'callout',
  label: 'Callout',
  category: 'content',
  icon: 'message-square-warning',
  description: 'A highlighted note: info, warning or tip.',
  defaultProps: { tone: 'info', markdown: 'Something worth noticing.' },
  propsSchema: calloutSchema,
  component: Callout,
})
