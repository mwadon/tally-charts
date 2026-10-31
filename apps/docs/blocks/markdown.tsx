import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TableRegion } from './table-region'

const remarkPlugins = [remarkGfm]

// A wide table scrolls inside its own focusable region instead of widening the page.
const components = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <TableRegion label="Table">
      <table>{children}</table>
    </TableRegion>
  ),
}

/**
 * GFM markdown from the CMS. There is deliberately no rehype-raw and `skipHtml` drops raw HTML
 * nodes (without it react-markdown shows them as escaped text). The default `urlTransform` drops
 * `javascript:` and other unsafe protocols.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components} skipHtml>
      {children}
    </ReactMarkdown>
  )
}
