import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import 'tally-charts/theme.css'

export const metadata: Metadata = {
  title: 'tally-charts',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
