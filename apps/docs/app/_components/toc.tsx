export interface TocItem {
  id: string
  label: string
}

function TocList({ items }: { items: readonly TocItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`}>{item.label}</a>
        </li>
      ))}
    </ul>
  )
}

/**
 * "On this page" comes in two forms and CSS shows one: a collapsed disclosure above the content
 * below 1100px (TocInline, first in the DOM) and a sticky right column from 1100px (TocColumn,
 * last). The hidden one is `display: none`, so assistive tech and Tab never see both.
 */
export function TocInline({ items }: { items: readonly TocItem[] }) {
  return (
    <details className="toc toc-inline">
      <summary>On this page</summary>
      <TocList items={items} />
    </details>
  )
}

export function TocColumn({ items }: { items: readonly TocItem[] }) {
  return (
    <nav className="toc toc-column" aria-label="On this page">
      <h2 className="toc-title">On this page</h2>
      <TocList items={items} />
    </nav>
  )
}
