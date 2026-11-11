'use client'

import { useEffect, useRef, useState } from 'react'

const ANNOUNCE_MS = 2000

interface CopyButtonProps {
  code: string
  /** Names what is copied, e.g. the filename or the language. */
  label: string
  /** An icon instead of the word "Copy"; the accessible name stays the same. */
  icon?: boolean
}

const COPY_ICON = 'M9 9h10v10H9zM5 15V5h10'
const DONE_ICON = 'M5 12.5l4.5 4.5L19 7.5'

/**
 * Copies `code` to the clipboard and announces the result. The live region is always mounted,
 * because screen readers only announce changes to a region that already exists.
 */
export function CopyButton({ code, label, icon = false }: CopyButtonProps) {
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    let result: string
    try {
      await navigator.clipboard.writeText(code)
      result = 'Copied'
    } catch {
      result = 'Copy failed'
    }
    setMessage(result)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(''), ANNOUNCE_MS)
  }

  return (
    <>
      <button
        type="button"
        className={icon ? 'code-copy code-copy-icon' : 'code-copy'}
        aria-label={`Copy code: ${label}`}
        onClick={copy}
      >
        {icon ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path d={message === 'Copied' ? DONE_ICON : COPY_ICON} />
          </svg>
        ) : message === 'Copied' ? (
          'Copied'
        ) : (
          'Copy'
        )}
      </button>
      <span role="status" aria-live="polite" className="visually-hidden">
        {message}
      </span>
    </>
  )
}
