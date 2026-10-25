import type { ReactNode } from 'react'

/** A table in a scrollable, focusable and named region, so keyboard users can scroll it. */
export function TableRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable, or keyboard users cannot scroll it
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  )
}
