import { CMSPage } from '@glokki-cms/react'
import { draftMode } from 'next/headers'
import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { blockRegistry, blockSchemas, componentRegistry, parseBlockProps } from './registry'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

beforeEach(() => {
  vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never)
})

const types = [
  'prose',
  'heading',
  'callout',
  'code-block',
  'chart-example',
  'props-table',
  'token-table',
  'palette-swatches',
  'hero',
  'visual-language',
  'gallery',
  'install',
  'feature-grid',
  'link-row',
  'chart-index',
  'cta',
]

const homeTypes = new Set(types.slice(8))

test('the registry has the eight content blocks and the eight home page blocks, in order', () => {
  expect(blockRegistry.getTypes()).toEqual(types)
  for (const type of types) expect(blockRegistry.getComponent(type)).toBeDefined()
})

test('serialized definitions survive JSON and have fields for every block', () => {
  const definitions = blockRegistry.getSerializedDefinitions()

  expect(JSON.parse(JSON.stringify(definitions))).toEqual(definitions)
  expect(definitions.map((d) => d.type)).toEqual(types)
  for (const d of definitions) {
    expect(d.fields.length).toBeGreaterThan(0)
    expect(d.category).toBe(homeTypes.has(d.type) ? 'home' : 'content')
  }
})

test('the registry declares the categories its blocks use', () => {
  expect(blockRegistry.getCategories()?.map((c) => c.key)).toEqual(['content', 'home'])
})

test('every defaultProps passes its own schema', () => {
  for (const d of blockRegistry.getSerializedDefinitions())
    expect(parseBlockProps(d.type, d.defaultProps).success, d.type).toBe(true)
})

test('blockSchemas has one schema per registered type', () => {
  expect(Object.keys(blockSchemas)).toEqual(types)
})

test('parseBlockProps validates by type', () => {
  expect(parseBlockProps('heading', { text: 'A', level: '2' }).success).toBe(true)
  expect(parseBlockProps('heading', { text: 'A', level: '4' }).success).toBe(false)
})

test('an unknown type is an error, also for names from Object.prototype', () => {
  for (const type of ['nope', 'constructor', 'toString']) {
    const result = parseBlockProps(type, {})
    expect(result.success).toBe(false)
  }
})

describe('componentRegistry', () => {
  type Guarded = (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>
  const guarded = (type: string) => componentRegistry.get(type) as unknown as Guarded
  const element = (node: unknown) => node as ReactElement<Record<string, unknown>>

  /** What the server sends for a page with these nodes. */
  async function html(componentTree: { id: string; type: string; props: object }[]) {
    const stream = await renderToReadableStream(
      createElement(CMSPage, {
        componentTree: componentTree as never,
        registry: componentRegistry,
      }),
    )
    await stream.allReady
    return new Response(stream).text()
  }

  afterEach(() => vi.unstubAllEnvs())

  test('has an entry for each of the sixteen types, in order', () => {
    expect([...componentRegistry.keys()]).toEqual(types)
  })

  test('valid props go to the component of the block as they are', async () => {
    for (const d of blockRegistry.getSerializedDefinitions()) {
      const out = element(await guarded(d.type)(d.defaultProps))

      expect(out.type, d.type).toBe(blockRegistry.getComponent(d.type))
      expect(out.props, d.type).toEqual(d.defaultProps)
    }
  })

  test('eager, which is not in the chart-example schema, still reaches the block', async () => {
    const props = { exampleId: 'bar-chart/margin-by-week', defaultView: 'preview', eager: true }
    const out = element(await guarded('chart-example')(props))

    expect(out.type).toBe(blockRegistry.getComponent('chart-example'))
    expect(out.props).toEqual(props)
  })

  test.each([
    ['gallery', { heading: 'Gallery' }, 'items'],
    ['gallery', { heading: 'Gallery', items: 'nope' }, 'items'],
    ['visual-language', { heading: 'Language' }, 'items'],
    ['feature-grid', { heading: 'Features', items: null }, 'items'],
    ['link-row', { heading: 'Links' }, 'items'],
    ['hero', { title: 'T', lede: 'L', exampleId: 'bar-chart/margin-by-week' }, 'actions'],
    ['code-block', { code: 'x', lang: 'cobol' }, 'lang'],
    ['code-block', { lang: 'ts' }, 'code'],
    ['prose', {}, 'markdown'],
    ['heading', { text: 'A', level: '4' }, 'level'],
    ['chart-example', { exampleId: 'bar-chart/margin-by-week' }, 'defaultView'],
    ['install', {}, 'heading'],
  ])('%s with %j is a block error that names %s, not a throw', async (type, props, prop) => {
    const out = await html([{ id: 'n', type, props }])
    document.body.innerHTML = out
    const box = document.querySelector('.block-error')

    expect(box?.textContent).toContain(`Invalid props of ${type}`)
    expect(box?.textContent).toContain(`${prop}:`)
    expect(document.body.children).toHaveLength(1)
  })

  test('a broken block does not take the rest of the page with it', async () => {
    const out = await html([
      { id: 'a', type: 'heading', props: { text: 'Before', level: '2' } },
      { id: 'b', type: 'gallery', props: { heading: 'Gallery' } },
      { id: 'c', type: 'code-block', props: { code: 'x', lang: 'cobol' } },
      { id: 'd', type: 'heading', props: { text: 'After', level: '2' } },
    ])

    expect(out).toContain('id="before"')
    expect(out).toContain('id="after"')
    expect(out.split('class="block-error"')).toHaveLength(3)
  })

  test('on production an invalid block renders nothing', async () => {
    vi.stubEnv('APP_ENV', 'production')

    const out = await html([
      { id: 'a', type: 'heading', props: { text: 'Before', level: '2' } },
      { id: 'b', type: 'gallery', props: { heading: 'Gallery' } },
    ])

    expect(out).toContain('id="before"')
    expect(out).not.toContain('block-error')
    expect(out).not.toContain('Invalid props')
  })

  test('on production in draft mode the error is shown', async () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.mocked(draftMode).mockResolvedValue({ isEnabled: true } as never)

    expect(await html([{ id: 'b', type: 'gallery', props: { heading: 'Gallery' } }])).toContain(
      'Invalid props of gallery',
    )
  })

  test('an unknown example id or symbol keeps the message of the block itself', async () => {
    const out = await html([
      { id: 'a', type: 'chart-example', props: { exampleId: 'nope/missing', defaultView: 'code' } },
      { id: 'b', type: 'props-table', props: { symbol: 'NotASymbol' } },
      {
        id: 'c',
        type: 'gallery',
        props: { heading: 'G', items: [{ exampleId: 'nope/tile' }] },
      },
    ])
    document.body.innerHTML = out
    const boxes = [...document.querySelectorAll('.block-error')].map((box) => box.textContent)

    expect(boxes).toEqual([
      'Unknown example: nope/missing',
      'Unknown symbol: NotASymbol',
      'Unknown example: nope/tile',
    ])
  })

  test('an example id that is not a string is an invalid prop', async () => {
    const out = await html([
      { id: 'a', type: 'chart-example', props: { exampleId: 7, defaultView: 'code' } },
    ])

    expect(out).toContain('Invalid props of chart-example')
  })
})
