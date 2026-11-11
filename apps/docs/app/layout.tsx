import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import 'tally-charts/theme.css'
import { siteUrl } from '../lib/metadata'
import { THEME_SCRIPT } from '../lib/theme'
import { outfit } from './fonts'
import './globals.css'
import '../examples/reference/reference.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: 'tally-charts',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT sets data-ch-theme on <html> before hydration
    // (`?theme=` first, then the stored choice; see lib/theme.ts).
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
