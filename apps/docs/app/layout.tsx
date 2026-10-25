import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import 'tally-charts/theme.css'
import { siteUrl } from '../lib/metadata'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: 'tally-charts',
}

// Lets `?theme=light|dark` force a theme (screenshots, review) by setting the attribute that
// theme.css already understands, before first paint. No storage: the real switch is F11.
const FORCE_THEME = `try{var t=new URLSearchParams(location.search).get('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-ch-theme',t)}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the script above sets data-ch-theme on <html> before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: FORCE_THEME }} />
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
