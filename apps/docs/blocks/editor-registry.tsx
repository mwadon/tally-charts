'use client'

import type { ComponentRegistry } from '@glokki-cms/react'
import { createLayoutRegistry, defineLayout } from '@glokki-cms/sdk'
import { type ComponentType, type ReactNode, Suspense } from 'react'
import { z } from 'zod'
import { ChartExample } from '../app/_components/chart-example'
import { examples } from '../examples.generated'
import { BlockError } from './block-error-box'
import { Callout } from './callout'
import type { ChartExampleBlockProps } from './chart-example'
import type { CodeBlockProps } from './code-block'
import type { GalleryProps } from './gallery'
import { Heading } from './heading'
import type { HeroProps } from './hero'
import {
  FeatureGrid,
  GalleryView,
  HeroView,
  InstallView,
  LinkRowView,
  VisualLanguageView,
} from './home-views'
import type { InstallProps } from './install'
import type { LinkRowProps } from './link-row'
import { PaletteSwatches } from './palette-swatches'
import { PropsTableView, type SymbolName, symbols } from './props-table-view'
import { Prose } from './prose'
import { TokenTable } from './token-table'
import type { VisualLanguageProps } from './visual-language'

/*
 * Client-side registry of the visual editor (`?_editor=1`). The server blocks that are async or
 * pull in Shiki (`code-block`, `chart-example`) cannot run in the browser, so the editor gets
 * simplified versions of them; the rest are the production components. An unknown reference is
 * always a visible `BlockError` here: the editor is an editing context and `APP_ENV` is not
 * available in the browser. Type-only imports from the server block modules keep them out of the
 * client bundle.
 */

/** `code-block` without Shiki and without the copy button. */
function EditorCodeBlock({ code, lang, filename }: CodeBlockProps) {
  const label = filename ?? lang
  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span className="code-block-name">{filename ?? ''}</span>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements lint/a11y/noNoninteractiveTabindex: a scrollable code region must be focusable, or keyboard users cannot scroll it */}
      <pre tabIndex={0} role="region" aria-label={label}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** `chart-example` with the lazy example component and a plain source instead of Shiki. */
function EditorChartExample({ exampleId, defaultView, height }: ChartExampleBlockProps) {
  if (!Object.hasOwn(examples, exampleId)) {
    return <BlockError>{`Unknown example: ${exampleId}`}</BlockError>
  }
  const entry = examples[exampleId]
  const filename = entry.file.slice(entry.file.lastIndexOf('/') + 1)
  const Example = entry.Component

  return (
    <ChartExample
      title={entry.title}
      preview={
        <Suspense fallback={null}>
          <Example />
        </Suspense>
      }
      code={<EditorCodeBlock code={entry.source} lang="tsx" filename={filename} />}
      defaultView={defaultView}
      height={height}
    />
  )
}

/** `props-table` without the server-only error helper. */
function EditorPropsTable({ symbol }: { symbol: SymbolName }) {
  if (!Object.hasOwn(symbols, symbol)) return <BlockError>{`Unknown symbol: ${symbol}`}</BlockError>
  return <PropsTableView symbol={symbol} />
}

/** The live chart of an example, lazy, as in `EditorChartExample`. */
function EditorExample({ exampleId }: { exampleId: string }) {
  const Example = examples[exampleId as keyof typeof examples].Component
  return (
    <Suspense fallback={null}>
      <Example />
    </Suspense>
  )
}

/**
 * The charts of the given ids, or the visible error for the first unknown one (stale content);
 * the home page blocks show the error instead of the whole block, as the server blocks do.
 */
function withExamples(
  ids: readonly string[],
  render: (charts: ReactNode[]) => ReactNode,
): ReactNode {
  const unknown = ids.find((id) => !Object.hasOwn(examples, id))
  if (unknown !== undefined) return <BlockError>{`Unknown example: ${unknown}`}</BlockError>
  return render(ids.map((id) => <EditorExample key={id} exampleId={id} />))
}

function EditorHero({ exampleId, ...rest }: HeroProps) {
  return withExamples([exampleId], ([chart]) => <HeroView {...rest} chart={chart} />)
}

function EditorVisualLanguage({ heading, items }: VisualLanguageProps) {
  return withExamples(
    items.map((item) => item.exampleId),
    (charts) => <VisualLanguageView heading={heading} items={items} charts={charts} />,
  )
}

function EditorGallery({ heading, lede, items }: GalleryProps) {
  return withExamples(
    items.map((item) => item.exampleId),
    (charts) => <GalleryView heading={heading} lede={lede} items={items} charts={charts} />,
  )
}

function EditorInstall({ heading, command = 'npm i tally-charts' }: InstallProps) {
  return (
    <InstallView heading={heading}>
      <EditorCodeBlock code={command} lang="bash" />
    </InstallView>
  )
}

/**
 * Always a link. The server `LinkRow` disables links to docs pages that do not exist yet, using
 * the navigation of the content source; that is read on the server (fixtures from the file
 * system, glokki with an API key), so it is not available in the browser. The editor shows every
 * link as it was typed.
 */
function EditorLinkRow({ heading, items }: LinkRowProps) {
  return <LinkRowView heading={heading} items={items} unavailable={new Set()} />
}

const components: Record<string, ComponentType<never>> = {
  prose: Prose,
  heading: Heading,
  callout: Callout,
  'code-block': EditorCodeBlock,
  'chart-example': EditorChartExample,
  'props-table': EditorPropsTable,
  'token-table': TokenTable,
  'palette-swatches': PaletteSwatches,
  hero: EditorHero,
  'visual-language': EditorVisualLanguage,
  gallery: EditorGallery,
  install: EditorInstall,
  'feature-grid': FeatureGrid,
  'link-row': EditorLinkRow,
}

export const editorRegistry: ComponentRegistry = new Map(
  Object.entries(components) as [string, ComponentType<Record<string, unknown>>][],
)

/**
 * `VisualEditorProvider` requires a layout registry, and `createLayoutRegistry` a `default`
 * layout. Next renders the header and the footer of the site, so this layout draws nothing.
 */
export const editorLayoutRegistry = createLayoutRegistry([
  defineLayout({
    key: 'default',
    headerSchema: z.object({}),
    footerSchema: z.object({}),
    Header: () => null,
    Footer: () => null,
  }),
])
