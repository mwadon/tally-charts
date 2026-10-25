import { CMSPage } from '@glokki-cms/react'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { componentRegistry } from '../blocks/registry'
import MarginByWeek from '../examples/bar-chart/margin-by-week'
import { getContentSource } from '../lib/content'
import { pageMetadata } from '../lib/metadata'
import { CodeBlock, Tok } from './_components/code-block'
import { EditorSwitch } from './_components/editor-switch'
import { PreviewNotice } from './_components/preview-notice'
import { SiteHeader } from './_components/site-header'
import { VisualLanguage } from './_components/visual-language'
import { SITE } from './_content/navigation'

const FEATURES = [
  {
    title: 'Accessible by default',
    text: 'Keyboard navigation, screen reader announcements, a hidden data table and forced-colors support.',
  },
  {
    title: 'Server Components',
    text: 'Charts render on the server and stay light on the client.',
  },
  {
    title: 'Themed with tokens',
    text: 'Every color, stripe and radius is a --ch-* CSS variable you can override.',
  },
  {
    title: 'Light and dark',
    text: 'Follows the system, or force a theme on any ancestor.',
  },
] as const

const DASHBOARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

async function loadHome() {
  const { isEnabled } = await draftMode()
  const page = await getContentSource(process.env, isEnabled).getPage('home')
  return { page, isEnabled }
}

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await loadHome()
  return page ? pageMetadata(page, '/') : {}
}

export default async function Home() {
  const { page, isEnabled } = await loadHome()
  if (!page) notFound()

  return (
    <>
      {isEnabled ? <PreviewNotice /> : null}
      <SiteHeader />
      <main id="main" className="home">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">React charts · {SITE.version}</p>
            <h1 id="hero-title">{SITE.hero}</h1>
            <p className="lede">
              Bars, lines, waterfalls and runways that say what changed, and whether it is on plan.
            </p>
            <p className="actions">
              <a className="button button-primary" href="/docs/line-chart">
                Read the docs
              </a>
              <a className="button" href={SITE.github}>
                GitHub
              </a>
            </p>
          </div>
          <div className="hero-visual">
            <div className="hatch-field" aria-hidden="true" />
            <div className="card hero-card">
              <MarginByWeek />
            </div>
          </div>
        </section>

        <section aria-labelledby="visual-language">
          <h2 id="visual-language">A visual language that reads at a glance</h2>
          <VisualLanguage />
        </section>

        <section aria-labelledby="gallery">
          <h2 id="gallery">Nine reference dashboards</h2>
          <p className="section-lede">
            Placeholder tiles: live examples of each dashboard arrive with the content site.
          </p>
          <ul className="gallery">
            {DASHBOARDS.map((n) => (
              <li key={n} className="card gallery-tile">
                <div className="hatch-field" aria-hidden="true" />
                <p>Dashboard {n}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="install">
          <h2 id="install">Install</h2>
          <CodeBlock filename="Terminal" label="Install tally-charts">
            <Tok k="fn">npm</Tok> i tally-charts
          </CodeBlock>
        </section>

        <section aria-labelledby="features">
          <h2 id="features">Built for real dashboards</h2>
          <ul className="card-grid card-grid-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="card">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="links">
          <h2 id="links">Keep going</h2>
          <ul className="link-row">
            <li>
              <span className="nav-soon" aria-disabled="true">
                Getting started (soon)
              </span>
            </li>
            <li>
              <a href={SITE.github}>GitHub</a>
            </li>
            <li>
              <a href={SITE.npm}>npm</a>
            </li>
          </ul>
        </section>

        <EditorSwitch componentTree={page.componentTree} pageSlug="/">
          <CMSPage componentTree={page.componentTree} registry={componentRegistry} />
        </EditorSwitch>
      </main>
      <footer className="site-footer">
        <p>tally-charts · MIT</p>
      </footer>
    </>
  )
}
