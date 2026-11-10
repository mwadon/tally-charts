'use client'

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from 'react'

interface GalleryPickerProps {
  /** `id` of the heading that names the tab list. */
  labelledBy: string
  items: readonly { label: string; caption?: string | undefined }[]
  /** One live example per item, in the same order. */
  panels: readonly ReactNode[]
}

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Tabs over the examples of the gallery: one is shown at full width, the rest on demand. A panel
 * is rendered the first time its tab is chosen and stays mounted after that, so a chart keeps its
 * state when the reader comes back. Without JavaScript the first example is the one shown.
 */
export function GalleryPicker({ labelledBy, items, panels }: GalleryPickerProps) {
  const baseId = useId()
  const [selected, setSelected] = useState(0)
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]))
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  function select(index: number) {
    setSelected(index)
    setVisited((prev) => (prev.has(index) ? prev : new Set(prev).add(index)))
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = items.length - 1
    let next: number
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else {
      const step = STEP[event.key]
      if (step === undefined) return
      next = (selected + step + items.length) % items.length
    }
    event.preventDefault()
    select(next)
    tabs.current[next]?.focus()
  }

  return (
    <div className="gallery-picker">
      <div className="gallery-tabs" role="tablist" aria-labelledby={labelledBy}>
        {items.map((item, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: the same example may appear twice; the position is the identity
            key={i}
            ref={(node) => {
              tabs.current[i] = node
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={i === selected}
            aria-controls={visited.has(i) ? `${baseId}-panel-${i}` : undefined}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={onKeyDown}
          >
            {item.label}
          </button>
        ))}
      </div>
      {panels.map((panel, i) =>
        visited.has(i) ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: the same example may appear twice; the position is the identity
            key={i}
            className="card gallery-tile"
            role="tabpanel"
            id={`${baseId}-panel-${i}`}
            aria-labelledby={`${baseId}-tab-${i}`}
            hidden={i !== selected}
          >
            {items[i]?.caption ? <p className="gallery-caption">{items[i].caption}</p> : null}
            {panel}
          </div>
        ) : null,
      )}
    </div>
  )
}
