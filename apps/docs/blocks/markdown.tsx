import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const remarkPlugins = [remarkGfm]

/**
 * GFM markdown from the CMS. There is deliberately no rehype-raw and `skipHtml` drops raw HTML
 * nodes (without it react-markdown shows them as escaped text). The default `urlTransform` drops
 * `javascript:` and other unsafe protocols.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} skipHtml>
      {children}
    </ReactMarkdown>
  )
}
