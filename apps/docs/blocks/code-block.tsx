import { defineBlock } from '@glokki-cms/sdk'
import { Fragment } from 'react'
import { z } from 'zod'
import { CopyButton } from './copy-button'
import { type CodeLang, codeLangs, highlight, type ThemedToken } from './highlight'

export const codeBlockSchema = z.object({
  code: z.string().meta({ fieldType: 'textarea' }),
  lang: z.enum(codeLangs),
  filename: z.string().optional(),
})

export type CodeBlockProps = z.infer<typeof codeBlockSchema>

// Shiki font style flags.
const ITALIC = 1
const BOLD = 2
const UNDERLINE = 4

function tokenStyle({ color, fontStyle = 0 }: ThemedToken) {
  return {
    color,
    fontStyle: fontStyle & ITALIC ? ('italic' as const) : undefined,
    fontWeight: fontStyle & BOLD ? 700 : undefined,
    textDecoration: fontStyle & UNDERLINE ? 'underline' : undefined,
  }
}

interface CodeBlockViewProps {
  code: string
  lang: CodeLang
  filename?: string | undefined
  lines: ThemedToken[][]
}

export function CodeBlockView({ code, lang, filename, lines }: CodeBlockViewProps) {
  const label = filename ?? lang
  const name = filename ?? (lang === 'bash' ? 'Terminal' : '')
  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span className="code-block-name">{name}</span>
        <CopyButton code={code} label={label} />
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements lint/a11y/noNoninteractiveTabindex: a scrollable code region must be focusable, or keyboard users cannot scroll it */}
      <pre tabIndex={0} role="region" aria-label={label}>
        <code>
          {lines.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity beyond their position
            <Fragment key={i}>
              {line.map((token, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: tokens have no identity beyond their position
                <span key={j} style={tokenStyle(token)}>
                  {token.content}
                </span>
              ))}
              {i < lines.length - 1 ? '\n' : ''}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  )
}

/** Server component: shiki runs on the server and only the copy button ships as client code. */
export async function CodeBlock({ code, lang, filename }: CodeBlockProps) {
  const lines = await highlight(code, lang)
  return <CodeBlockView code={code} lang={lang} filename={filename} lines={lines} />
}

export const codeBlockBlock = defineBlock({
  type: 'code-block',
  label: 'Code block',
  category: 'content',
  icon: 'code',
  description: 'Syntax-highlighted code with a copy button.',
  defaultProps: { code: "console.log('hello')", lang: 'ts' },
  propsSchema: codeBlockSchema,
  component: CodeBlock,
})
