'use client'

import { useEffect, useRef, useState } from 'react'

const ANNOUNCE_MS = 2000

interface CopyButtonProps {
  code: string
  /** Names what is copied, e.g. the filename or the language. */
  label: string
}

/**
 * Copies `code` to the clipboard and announces the result. The live region is always mounted,
 * because screen readers only announce changes to a region that already exists.
 */
export function CopyButton({ code, label }: CopyButtonProps) {
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
      <button type="button" className="code-copy" aria-label={`Copy code: ${label}`} onClick={copy}>
        {message === 'Copied' ? 'Copied' : 'Copy'}
      </button>
      <span role="status" aria-live="polite" className="visually-hidden">
        {message}
      </span>
    </>
  )
}
