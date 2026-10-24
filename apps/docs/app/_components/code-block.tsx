import type { ReactNode } from 'react'

export type TokenKind = 'keyword' | 'string' | 'number' | 'tag' | 'comment' | 'fn'

/** A hand-colored span: the placeholder has no highlighter (Shiki arrives with F12). */
export function Tok({ k, children }: { k: TokenKind; children: ReactNode }) {
  return <span data-tok={k}>{children}</span>
}

interface CodeBlockProps {
  children: ReactNode
  /** Shown in the header bar, e.g. "app/page.tsx". */
  filename?: string
  /** Accessible label of the block, used for the copy button too. */
  label: string
}

/**
 * Static code block. The copy button is visual only for now: the working "Copied" state with a
 * live region belongs to F12.
 */
export function CodeBlock({ children, filename, label }: CodeBlockProps) {
  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span className="code-block-name">{filename ?? ''}</span>
        <button type="button" className="code-copy" aria-label={`Copy code: ${label}`}>
          Copy
        </button>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements lint/a11y/noNoninteractiveTabindex: a scrollable code region must be focusable, or keyboard users cannot scroll it */}
      <pre tabIndex={0} role="region" aria-label={label}>
        <code>{children}</code>
      </pre>
    </div>
  )
}
