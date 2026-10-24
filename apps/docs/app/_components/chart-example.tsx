'use client'

import { type ReactNode, useId, useState } from 'react'

interface ChartExampleProps {
  /** Heading of the card, also the accessible name of the toggle group. */
  title: string
  /** The live chart. */
  preview: ReactNode
  /** The source of the example, as a (static) code block. */
  code: ReactNode
}

/** A live chart with a Preview / Code toggle. Both panels keep the same height. */
export function ChartExample({ title, preview, code }: ChartExampleProps) {
  const [view, setView] = useState<'preview' | 'code'>('preview')
  const previewId = useId()
  const codeId = useId()

  return (
    <div className="chart-example" data-view={view}>
      <div className="chart-example-bar">
        <span className="chart-example-title">{title}</span>
        <fieldset className="segmented">
          <legend className="visually-hidden">{`View of ${title}`}</legend>
          <button
            type="button"
            aria-pressed={view === 'preview'}
            aria-controls={previewId}
            onClick={() => setView('preview')}
          >
            Preview
          </button>
          <button
            type="button"
            aria-pressed={view === 'code'}
            aria-controls={codeId}
            onClick={() => setView('code')}
          >
            Code
          </button>
        </fieldset>
      </div>
      <div id={previewId} className="chart-example-panel" hidden={view !== 'preview'}>
        {preview}
      </div>
      <div id={codeId} className="chart-example-panel" hidden={view !== 'code'}>
        {code}
      </div>
    </div>
  )
}
