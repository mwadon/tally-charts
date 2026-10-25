import { draftMode } from 'next/headers'
import { BlockError } from './block-error-box'

/**
 * Whether blocks show their errors: in every environment except `APP_ENV=production`, so an
 * editor sees a broken reference in preview and a reader never sees one on the live site. In
 * draft mode (`/preview`) they show on production too. Draft mode is read only on production,
 * so ordinary pages and the build never touch request data; outside a request it is off.
 */
export async function showsBlockErrors(env: Record<string, string | undefined> = process.env) {
  if (env.APP_ENV !== 'production') return true
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
}

/** The box with `message`, or nothing on production outside draft mode. */
export async function blockError(message: string) {
  return (await showsBlockErrors()) ? <BlockError>{message}</BlockError> : null
}
