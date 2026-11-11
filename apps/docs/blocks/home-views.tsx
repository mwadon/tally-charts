import { type ReactNode, useId } from 'react'
import { ChartThumb, type ThumbName } from './chart-thumbs'
import { CopyButton } from './copy-button'
import { GalleryPicker } from './gallery-picker'
import { CtaArt, HomeArt } from './home-art'

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
  /** Install command shown under the buttons, with a copy button. */
  command?: string | undefined
  /** The live chart of the example, loaded by the server block or by the editor. */
  chart: ReactNode
  /** The code that draws the chart, as a code block next to it. */
  code?: ReactNode
  /** Heading and sentence above the code. */
  demoHeading?: string | undefined
  demoText?: string | undefined
  /** Title and note shown in the card above the chart. */
  chartTitle?: string | undefined
  chartNote?: string | undefined
}

/** A one-line shell command with a copy button (an icon). */
function InstallLine({ command }: { command: string }) {
  return (
    <div className="install-line">
      <code>{command}</code>
      <CopyButton code={command} label={command} icon />
    </div>
  )
}

export function HeroView({
  eyebrow,
  title,
  lede,
  actions,
  command,
  chart,
  code,
  demoHeading,
  demoText,
  chartTitle,
  chartNote,
}: HeroViewProps) {
  const titleId = useId()
  const hasDemoCopy = Boolean(demoHeading || demoText || code)
  return (
    <section className="home-section hero" aria-labelledby={titleId}>
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
        {command ? <InstallLine command={command} /> : null}
      </div>
      <HomeArt />
      <div className={hasDemoCopy ? 'hero-demo hero-demo-split' : 'hero-demo'}>
        {hasDemoCopy ? (
          <div className="hero-demo-copy">
            {demoHeading ? <h2>{demoHeading}</h2> : null}
            {demoText ? <p className="section-lede">{demoText}</p> : null}
            {code ? <div className="hero-code">{code}</div> : null}
          </div>
        ) : null}
        <div className="card hero-card">
          {chartTitle || chartNote ? (
            <p className="hero-card-head">
              {chartTitle ? <span className="hero-card-title">{chartTitle}</span> : null}{' '}
              {chartNote ? <span className="hero-card-note">{chartNote}</span> : null}
            </p>
          ) : null}
          <div className="hero-chart">{chart}</div>
        </div>
      </div>
    </section>
  )
}

export interface VisualLanguageViewProps {
  heading: string
  lede?: string | undefined
  items: readonly { title: string; text: string }[]
  /** One live chart per item, in the same order. */
  charts: readonly ReactNode[]
}

export function VisualLanguageView({ heading, lede, items, charts }: VisualLanguageViewProps) {
  const headingId = useId()
  return (
    <section className="home-section band" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {lede ? <p className="section-lede">{lede}</p> : null}
      <ul className="card-grid card-grid-4">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: editors may repeat a title; the position is the identity
          <li key={i} className="card">
            <div className="rule-chart">{charts[i]}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export interface GalleryViewProps {
  heading: string
  lede?: string | undefined
  /** `label` names the tab of the example, `caption` is the sentence shown above it. */
  items: readonly { label: string; caption?: string | undefined }[]
  /** One live chart per item, in the same order. */
  charts: readonly ReactNode[]
}

/** The examples behind tabs: one dashboard at a time, at the full width of the page. */
export function GalleryView({ heading, lede, items, charts }: GalleryViewProps) {
  const headingId = useId()
  return (
    <section id="dashboards" className="home-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {lede ? <p className="section-lede">{lede}</p> : null}
      <GalleryPicker labelledBy={headingId} items={items} panels={charts} />
    </section>
  )
}

export interface ChartIndexViewProps {
  heading: string
  lede?: string | undefined
  items: readonly { label: string; text: string; href: string; thumb: ThumbName }[]
}

/** A tile per chart type: a small drawing, the name and what the chart is for, linked to its page. */
export function ChartIndexView({ heading, lede, items }: ChartIndexViewProps) {
  const headingId = useId()
  return (
    <section id="charts" className="home-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {lede ? <p className="section-lede">{lede}</p> : null}
      <ul className="chart-index">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: editors may repeat a tile; the position is the identity
          <li key={i}>
            <a className="card chart-tile" href={item.href}>
              <ChartThumb name={item.thumb} />
              {/* The space separates the two in the accessible name; a flex container drops it. */}
              <span className="chart-tile-name">{item.label}</span>{' '}
              <span className="chart-tile-text">{item.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export interface CtaViewProps {
  heading: string
  text?: string | undefined
  command?: string | undefined
  action?: { label: string; href: string } | undefined
}

/** The closing band of the home page: one sentence, the install command and one button. */
export function CtaView({ heading, text, command, action }: CtaViewProps) {
  const headingId = useId()
  return (
    <section className="home-section cta" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {text ? <p className="cta-text">{text}</p> : null}
      {command || action ? (
        <div className="cta-actions">
          {command ? <InstallLine command={command} /> : null}
          {action ? (
            <a className="button button-primary" href={action.href}>
              {action.label}
            </a>
          ) : null}
        </div>
      ) : null}
      <CtaArt />
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
    <section className="home-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {children}
    </section>
  )
}

export interface FeatureGridProps {
  heading: string
  /** With `href` the card ends with a link, labelled `linkLabel` (default "Learn more"). */
  items: readonly {
    title: string
    text: string
    href?: string | undefined
    linkLabel?: string | undefined
  }[]
}

/** Synchronous and free of server code, so the server registry and the editor share it. */
export function FeatureGrid({ heading, items }: FeatureGridProps) {
  const headingId = useId()
  return (
    <section className="home-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <ul className="card-grid card-grid-4">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: editors may repeat a title; the position is the identity
          <li key={i} className="card feature-card">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            {item.href ? (
              <p className="card-link">
                <a href={item.href}>{item.linkLabel ?? 'Learn more'}</a>
              </p>
            ) : null}
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
    <section className="home-section" aria-labelledby={headingId}>
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
