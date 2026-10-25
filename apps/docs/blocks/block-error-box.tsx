import type { ReactNode } from 'react'

/** A visible box for a block that cannot render. Client-safe, unlike `blockError`. */
export function BlockError({ children }: { children: ReactNode }) {
  return (
    <div className="block-error" role="note">
      {children}
    </div>
  )
}
