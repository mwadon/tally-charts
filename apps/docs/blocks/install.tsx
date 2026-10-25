import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { CodeBlock } from './code-block'
import { InstallView } from './home-views'

const DEFAULT_COMMAND = 'npm i tally-charts'

export const installSchema = z.object({
  heading: z.string().min(1),
  command: z.string().min(1).default(DEFAULT_COMMAND),
})

export type InstallProps = z.input<typeof installSchema>

/** Server component: the command in a highlighted, copyable bash block. */
export async function Install({ heading, command = DEFAULT_COMMAND }: InstallProps) {
  return (
    <InstallView heading={heading}>{await CodeBlock({ code: command, lang: 'bash' })}</InstallView>
  )
}

export const installBlock = defineBlock({
  type: 'install',
  label: 'Install',
  category: 'home',
  icon: 'terminal',
  description: 'A heading and an install command with a copy button.',
  defaultProps: { heading: 'Install', command: DEFAULT_COMMAND },
  propsSchema: installSchema,
  component: Install,
})
