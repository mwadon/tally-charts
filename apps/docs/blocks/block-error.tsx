import type { ReactNode } from 'react'

/**
 * Whether blocks show their errors: in every environment except `APP_ENV=production`, so an
 * editor sees a broken reference in preview and a reader never sees one on the live site.
 */
export function showsBlockErrors(env: Record<string, string | undefined> = process.env) {
  return env.APP_ENV !== 'production'
}

/** A visible box for a block that cannot render. */
export function BlockError({ children }: { children: ReactNode }) {
  return (
    <div className="block-error" role="note">
      {children}
    </div>
  )
}

/** The box with `message`, or nothing on production. */
export function blockError(message: string) {
  return showsBlockErrors() ? <BlockError>{message}</BlockError> : null
}
