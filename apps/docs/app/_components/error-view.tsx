interface ErrorViewProps {
  /** Renders the failed segment again. */
  retry: () => void
  /** The id Next gives a server error; it is what the server log has, so it is worth showing. */
  digest?: string | undefined
}

/**
 * What `error.tsx` and `global-error.tsx` show. It has no site header: that one is a server
 * component (it reads the package version), and an error boundary is client code.
 */
export function ErrorView({ retry, digest }: ErrorViewProps) {
  return (
    <main id="main" className="home status-page">
      <p className="eyebrow">Error</p>
      <h1>Something went wrong</h1>
      <p className="lede">The page could not be shown. Try again, or go back to the home page.</p>
      {digest ? (
        <p className="small">
          Reference: <code>{digest}</code>
        </p>
      ) : null}
      <p className="actions">
        <button type="button" className="button button-primary" onClick={retry}>
          Try again
        </button>
        <a className="button" href="/">
          Home
        </a>
      </p>
    </main>
  )
}
