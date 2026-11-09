/**
 * The origins in `value` (one, or several separated by commas) as `scheme://host[:port]`. Anything
 * that is not an http(s) URL is dropped, so a wildcard or a stray directive never reaches the
 * allowlist of the editor or the `frame-ancestors` source list.
 */
export function parseEditorOrigins(value: string | undefined): string[] {
  const origins = (value ?? '').split(',').flatMap((entry) => {
    const text = entry.trim()
    if (!/^https?:\/\/[^\s*;,'"]+$/i.test(text)) return []
    try {
      return [new URL(text).origin]
    } catch {
      return []
    }
  })
  return [...new Set(origins)]
}

/**
 * The origins of the glokki admin that may frame the site and drive the visual editor over
 * `postMessage`. `NEXT_PUBLIC_*` is inlined at build time, so the browser and `next.config.ts`
 * read the same list; empty (the default) means no origin is trusted.
 */
export function editorOrigins(): string[] {
  return parseEditorOrigins(process.env.NEXT_PUBLIC_CMS_EDITOR_ORIGIN)
}
