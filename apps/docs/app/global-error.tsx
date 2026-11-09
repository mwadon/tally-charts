'use client'

import 'tally-charts/theme.css'
import './globals.css'
import { ErrorView } from './_components/error-view'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * An error thrown by the root layout itself. It replaces the layout, so it brings its own
 * `<html>` and the stylesheets; the theme follows the system (the theme script is not here).
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong · tally-charts</title>
      </head>
      <body>
        <ErrorView retry={reset} digest={error.digest} />
      </body>
    </html>
  )
}
