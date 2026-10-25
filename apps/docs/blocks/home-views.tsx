import { type ReactNode, useId } from 'react'

/*
 * The markup of the home page blocks. The server blocks (`hero.tsx`, ...) load their charts and
 * hand them to these views; the visual editor renders the same views with lazy example
 * components. This module must stay free of anything server-only (`next/headers`, Shiki, the
 * content source), because the client editor registry imports it.
 */

export interface HeroViewProps {
  eyebrow?: string | undefined
  title: string
  lede: string
  actions: readonly { label: string; href: string; primary?: boolean | undefined }[]
  /** The live chart of the example, loaded by the server block or by the editor. */
  chart: ReactNode
}

export function HeroView({ eyebrow, title, lede, actions, chart }: HeroViewProps) {
  const titleId = useId()
  return (
    <section className="hero" aria-labelledby={titleId}>
      <div className="hero-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 id={titleId}>{title}</h1>
        <p className="lede">{lede}</p>
        <p className="actions">
          {actions.map((action) => (
            <a
              key={`${action.label}|${action.href}`}
              className={action.primary ? 'button button-primary' : 'button'}
              href={action.href}
            >
              {action.label}
            </a>
          ))}
        </p>
      </div>
      <div className="hero-visual">
        <div className="hatch-field" aria-hidden="true" />
        <div className="card hero-card">{chart}</div>
      </div>
    </section>
  )
}

export interface VisualLanguageViewProps {
  items: readonly { title: string; text: string }[]
  /** One live chart per item, in the same order. */
  charts: readonly ReactNode[]
}

export function VisualLanguageView({ items, charts }: VisualLanguageViewProps) {
  return (
    <ul className="card-grid card-grid-4">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: editors may repeat a title; the position is the identity
        <li key={i} className="card">
          {charts[i]}
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      ))}
    </ul>
  )
}

export interface GalleryViewProps {
  heading: string
  lede?: string | undefined
  items: readonly { caption?: string | undefined }[]
  /** One live chart per item, in the same order. */
  charts: readonly ReactNode[]
}

export function GalleryView({ heading, lede, items, charts }: GalleryViewProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {lede ? <p className="section-lede">{lede}</p> : null}
      <ul className="gallery">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the same example may appear twice; the position is the identity
          <li key={i} className="card gallery-tile">
            {charts[i]}
            {item.caption ? <p>{item.caption}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export interface InstallViewProps {
  heading: string
  /** The command in a code block. */
  children: ReactNode
}

export function InstallView({ heading, children }: InstallViewProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {children}
    </section>
  )
}

export interface FeatureGridProps {
  heading: string
  items: readonly { title: string; text: string }[]
}

/** Synchronous and free of server code, so the server registry and the editor share it. */
export function FeatureGrid({ heading, items }: FeatureGridProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <ul className="card-grid card-grid-4">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: editors may repeat a title; the position is the identity
          <li key={i} className="card">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const DOCS_HREF = /^\/docs\/([^/?#]+)/

export interface LinkRowViewProps {
  heading: string
  items: readonly { label: string; href: string }[]
  /** Slugs of docs pages that do not exist yet; links to them are shown disabled. */
  unavailable: ReadonlySet<string>
}

export function LinkRowView({ heading, items, unavailable }: LinkRowViewProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <ul className="link-row">
        {items.map((item, i) => {
          const slug = DOCS_HREF.exec(item.href)?.[1]
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: editors may repeat a link; the position is the identity
            <li key={i}>
              {slug !== undefined && unavailable.has(slug) ? (
                <span className="nav-soon" aria-disabled="true">
                  {item.label}
                </span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
