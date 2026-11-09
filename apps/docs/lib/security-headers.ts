import { parseEditorOrigins } from './editor-origin'

type Env = Record<string, string | undefined>

/**
 * Headers of every response. The CSP has `frame-ancestors` only: the site itself and the editor
 * origins of `NEXT_PUBLIC_CMS_EDITOR_ORIGIN` may frame the pages (the glokki visual editor shows
 * them in an iframe). There is no `script-src` or `style-src` on purpose: the theme script and
 * Next's own scripts are inline.
 */
export function securityHeaders(env: Env = process.env) {
  const ancestors = ["'self'", ...parseEditorOrigins(env.NEXT_PUBLIC_CMS_EDITOR_ORIGIN)]
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Content-Security-Policy', value: `frame-ancestors ${ancestors.join(' ')}` },
  ]
}
