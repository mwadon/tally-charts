import { CMSPageEditor, VisualEditorProvider } from '@glokki-cms/react'
import { createMessage } from '@glokki-cms/sdk'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import line from '../content/line-chart.json'
import type { ComponentNode } from '../lib/content'
import { editorLayoutRegistry, editorRegistry } from './editor-registry'
import { blockRegistry } from './registry'

let errors: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errors.mockRestore()
  history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
})

const tree = line.componentTree as unknown as ComponentNode[]

function renderEditor(componentTree: ComponentNode[] = tree) {
  return render(
    <VisualEditorProvider
      registry={editorRegistry}
      layoutRegistry={editorLayoutRegistry}
      fallbackTree={componentTree}
      pageSlug="/docs/line-chart"
    >
      <CMSPageEditor />
    </VisualEditorProvider>,
  )
}

test('the editor registry covers exactly the block types of the server registry, in order', () => {
  const types = blockRegistry.getTypes()

  expect(types).toHaveLength(14)
  expect([...editorRegistry.keys()]).toEqual(types)
  for (const component of editorRegistry.values()) expect(component).toBeDefined()
})

test('CMSPageEditor renders the blocks of line-chart.json from the fallback tree', async () => {
  const { container } = renderEditor()

  expect(await screen.findByRole('heading', { level: 2, name: /^Props/ })).toBeTruthy()
  expect(container.querySelector('h2#props')).not.toBeNull()
  expect(await screen.findByRole('application', { name: /Monthly revenue/ })).toBeTruthy()
  expect(container.querySelector('.block-error')).toBeNull()
  expect(errors).not.toHaveBeenCalled()
})

// Only the SDK's editor mode (`_editor=1` together with `_editorOrigin`, as in the glökki iframe)
// wraps blocks in `[data-block-id]`; the fallback tree above is rendered without wrappers.
test('in editor mode the tree from the CMS is rendered as blocks with data-block-id', async () => {
  const origin = 'http://cms.test'
  // jsdom has no ResizeObserver, which the editor uses to report the page height.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  history.replaceState(null, '', `/docs/line-chart?_editor=1&_editorOrigin=${origin}`)
  const { container } = renderEditor([])

  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin,
        data: createMessage('tree:update', {
          componentTree: tree,
          selectedBlockId: null,
          viewport: 'desktop',
        }),
      }),
    )
  })

  expect(await screen.findByRole('application', { name: /Monthly revenue/ })).toBeTruthy()
  const ids = [...container.querySelectorAll('[data-block-id]')].map((el) =>
    el.getAttribute('data-block-id'),
  )
  expect(ids).toEqual((line.componentTree as { id: string }[]).map((node) => node.id))
  expect(container.querySelector('.block-error')).toBeNull()
  expect(errors).not.toHaveBeenCalled()
})

test('the simplified code block shows the plain source without a highlighter', () => {
  const { container } = renderEditor([
    {
      id: 'c1',
      type: 'code-block',
      props: { code: 'const a = 1', lang: 'ts', filename: 'a.ts' },
      children: [],
    },
  ] as unknown as ComponentNode[])

  expect(screen.getByRole('region', { name: 'a.ts' }).textContent).toBe('const a = 1')
  expect(container.querySelector('[style*="--shiki"]')).toBeNull()
  expect(errors).not.toHaveBeenCalled()
})

test('an unknown example or symbol is always a visible error', () => {
  const { container } = renderEditor([
    { id: 'e1', type: 'chart-example', props: { exampleId: 'nope', defaultView: 'preview' } },
    { id: 'e2', type: 'props-table', props: { symbol: 'NotASymbol' } },
  ] as unknown as ComponentNode[])

  const boxes = [...container.querySelectorAll('.block-error')].map((box) => box.textContent)
  expect(boxes).toEqual(['Unknown example: nope', 'Unknown symbol: NotASymbol'])
})

test('the home page blocks render in the editor: the chart is live and a link is always a link', async () => {
  const { container } = renderEditor([
    {
      id: 'h1',
      type: 'hero',
      props: {
        title: 'Charts',
        lede: 'Lede',
        actions: [{ label: 'Docs', href: '/docs/getting-started', primary: true }],
        exampleId: 'bar-chart/margin-by-week',
      },
    },
    {
      id: 'l1',
      type: 'link-row',
      props: { heading: 'Keep going', items: [{ label: 'Soon', href: '/docs/getting-started' }] },
    },
    { id: 'i1', type: 'install', props: { heading: 'Install' } },
  ] as unknown as ComponentNode[])

  expect(await screen.findByRole('application', { name: /Margin by week/ })).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1, name: 'Charts' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Soon' }).getAttribute('href')).toBe(
    '/docs/getting-started',
  )
  expect(container.querySelector('.nav-soon')).toBeNull()
  expect(screen.getByRole('region', { name: 'bash' }).textContent).toBe('npm i tally-charts')
  expect(container.querySelector('.block-error')).toBeNull()
  expect(errors).not.toHaveBeenCalled()
})

test('a home page block with an unknown example is a visible error in the editor', () => {
  const { container } = renderEditor([
    {
      id: 'v1',
      type: 'visual-language',
      props: { items: [{ title: 'a', text: 'b', exampleId: 'nope/missing' }] },
    },
    { id: 'g1', type: 'gallery', props: { heading: 'G', items: [{ exampleId: 'nope/also' }] } },
  ] as unknown as ComponentNode[])

  const boxes = [...container.querySelectorAll('.block-error')].map((box) => box.textContent)
  expect(boxes).toEqual(['Unknown example: nope/missing', 'Unknown example: nope/also'])
})
