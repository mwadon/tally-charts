'use client'

import { ErrorView } from './_components/error-view'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** An error thrown while rendering a page; the root layout (and the skip link) stays. */
export default function PageError({ error, reset }: ErrorProps) {
  return <ErrorView retry={reset} digest={error.digest} />
}
