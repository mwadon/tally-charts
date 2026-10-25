'use client'

import type { ComponentRegistry } from '@glokki-cms/react'
import { createLayoutRegistry, defineLayout } from '@glokki-cms/sdk'
import { type ComponentType, Suspense } from 'react'
import { z } from 'zod'
import { ChartExample } from '../app/_components/chart-example'
import { examples } from '../examples.generated'
import { BlockError } from './block-error-box'
import { Callout } from './callout'
import type { ChartExampleBlockProps } from './chart-example'
import type { CodeBlockProps } from './code-block'
import { Heading } from './heading'
import { PaletteSwatches } from './palette-swatches'
import { PropsTableView, type SymbolName, symbols } from './props-table-view'
import { Prose } from './prose'
import { TokenTable } from './token-table'

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

const components: Record<string, ComponentType<never>> = {
  prose: Prose,
  heading: Heading,
  callout: Callout,
  'code-block': EditorCodeBlock,
  'chart-example': EditorChartExample,
  'props-table': EditorPropsTable,
  'token-table': TokenTable,
  'palette-swatches': PaletteSwatches,
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
