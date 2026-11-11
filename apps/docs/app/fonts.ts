import localFont from 'next/font/local'

/**
 * Outfit, the heading face (SIL Open Font License, `fonts/OFL.txt`). The file is in the repo, so
 * a build needs no network. Exposed as `--font-outfit`; `globals.css` reads it in
 * `--docs-heading-font`.
 */
export const outfit = localFont({
  src: './fonts/outfit-latin-wght.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-outfit',
})
