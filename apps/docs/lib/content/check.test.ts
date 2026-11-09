// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { symbols } from '../../blocks/props-table-view'
import { examples } from '../../examples.generated'
import { checkPages, docsLinkSlugs, formatIssue } from './check'
import { checkSources, selectSources } from './check-sources'
import { createFixtureSource } from './fixtures'
import type { ComponentNode, ContentSource, DeliveryPage } from './types'

const appDir = path.join(import.meta.dirname, '..', '..')
const realDir = path.join(appDir, 'content')
const brokenDir = path.join(import.meta.dirname, '__fixtures__', 'broken')

async function pagesOf(dir: string) {
  const source = createFixtureSource({ dir })
  const items = await source.listPages()
  const pages = await Promise.all(items.map((item) => source.getPage(item.slug)))
  return pages.filter((page): page is DeliveryPage => page !== null)
}

function page(slug: string, componentTree: ComponentNode[]): DeliveryPage {
  return { slug, title: slug, componentTree } as unknown as DeliveryPage
}

function defined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected a value')
  return value
}

const prose = (id: string, markdown: string): ComponentNode => ({
  id,
  type: 'prose',
  props: { markdown },
})

describe('the broken fixtures', () => {
  test('give exactly one readable message per problem', async () => {
    const { errors } = checkPages(await pagesOf(brokenDir))
    const lines = errors.map(formatIssue)

    expect(lines).toHaveLength(9)
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.stringContaining('broken › bad-example (chart-example)'),
        expect.stringContaining('broken › bad-prop (heading)'),
        expect.stringContaining('broken › bad-link (prose)'),
        expect.stringContaining('broken › bad-symbol (props-table)'),
        expect.stringContaining('broken › bad-type (carousel)'),
        'broken › bad-hero-link (hero): link /docs/no-such-hero-target points at a missing page "no-such-hero-target"',
        'broken › bad-row-link (link-row): link /docs/no-such-row-target points at a missing page "no-such-row-target"',
        'broken › bad-heading-id (heading): heading id "same-title" is already used by first-heading; set another anchor',
        'broken › bad-anchor (heading): heading id "same-title" is already used by first-heading; set another anchor',
      ]),
    )
    const byNode = Object.fromEntries(errors.map((e) => [e.nodeId, formatIssue(e)]))
    expect(byNode['bad-example']).toContain('exampleId "nope/missing" does not exist')
    expect(byNode['bad-prop']).toMatch(/\blevel:/)
    expect(byNode['bad-link']).toContain('/docs/does-not-exist')
    expect(byNode['bad-symbol']).toContain('symbol "NoSuchSymbol"')
    expect(byNode['bad-type']).toContain('unknown block type "carousel"')
  })

  test('the exampleId message does not list the ids of all examples', async () => {
    const { errors } = checkPages(await pagesOf(brokenDir))
    const message = formatIssue(defined(errors.find((e) => e.nodeId === 'bad-example')))
    for (const id of Object.keys(examples)) expect(message).not.toContain(id)
  })

  test('the ok page has no issue', async () => {
    const pages = (await pagesOf(brokenDir)).filter((p) => p.slug === 'ok')
    expect(checkPages(pages).errors).toEqual([])
  })
})

describe('schema issues', () => {
  test('a long enum is summarised, a short one is listed', () => {
    const { errors } = checkPages([
      page('p', [
        { id: 'c', type: 'code-block', props: { code: 'x', lang: 'cobol' } },
        { id: 'h', type: 'heading', props: { text: 'x', level: '9' } },
      ]),
    ])
    const code = formatIssue(defined(errors.find((e) => e.nodeId === 'c')))
    const heading = formatIssue(defined(errors.find((e) => e.nodeId === 'h')))
    expect(code).toMatch(/lang: expected one of \d+ values/)
    expect(heading).toContain('level: expected one of "2", "3"')
  })

  test('a missing prop is reported with its path, and nested nodes are walked', () => {
    const { errors } = checkPages([
      page('p', [
        {
          id: 'outer',
          type: 'prose',
          props: { markdown: 'x' },
          children: [{ id: 'inner', type: 'prose', props: {} }],
        },
      ]),
    ])
    expect(errors.map(formatIssue)).toEqual([
      expect.stringMatching(/^p › inner \(prose\): markdown:/),
    ])
  })
})

describe('internal links', () => {
  const ok = page('ok', [prose('n', 'x')])

  test.each([
    '[a](/docs/ok)',
    '[a](/docs/ok#anchor)',
    '[a](/docs/ok?x=1)',
    '[a](/docs/ok "title")',
    '</docs/ok>',
    '[a]: /docs/ok',
    '[a](https://example.com/docs/missing)',
    '[a](/cdn/docs/missing.svg)',
    '[a](/docs)',
    '`[a](/docs/missing)`',
    '```md\n[a](/docs/missing)\n```',
  ])('%s is not an error', (markdown) => {
    const { errors } = checkPages([ok, page('other', [prose('l', markdown)])])
    expect(errors).toEqual([])
  })

  test.each([
    ['[a](/docs/gone#top)', 'gone'],
    ['<https://x.y> and </docs/gone>', 'gone'],
    ['[a][ref]\n\n[ref]: /docs/gone', 'gone'],
  ])('%s is a dead link', (markdown, slug) => {
    const { errors } = checkPages([ok, page('other', [prose('l', markdown)])])
    expect(errors.map(formatIssue)).toEqual([
      `other › l (prose): link /docs/${slug} points at a missing page "${slug}"`,
    ])
  })

  test('callout markdown is checked too', () => {
    const { errors } = checkPages([
      page('c', [
        { id: 'k', type: 'callout', props: { tone: 'info', markdown: '[a](/docs/gone)' } },
      ]),
    ])
    expect(errors).toHaveLength(1)
  })

  test('docsLinkSlugs drops anchors, queries and trailing slashes', () => {
    expect(docsLinkSlugs('[a](/docs/x/#y) [b](/docs/z?q) [c](/docs/x)')).toEqual(['x', 'z'])
  })

  const hero = (actions: unknown): ComponentNode => ({
    id: 'h',
    type: 'hero',
    props: { title: 'T', lede: 'L', actions, exampleId: 'bar-chart/margin-by-week' },
  })
  const linkRow = (items: unknown): ComponentNode => ({
    id: 'r',
    type: 'link-row',
    props: { heading: 'H', items },
  })

  test.each([
    '/docs/ok',
    '/docs/ok/',
    '/docs/ok#anchor',
    '/docs/ok?x=1',
    '/docs',
    '/',
    '#top',
    'https://example.com/docs/missing',
    '/cdn/docs/missing.svg',
  ])('a hero button or a link row item to %s is not an error', (href) => {
    const nodes = [hero([{ label: 'a', href }]), linkRow([{ label: 'a', href }])]
    expect(checkPages([ok, page('other', nodes)]).errors).toEqual([])
  })

  test.each([
    ['/docs/gone', 'gone'],
    ['/docs/gone#top', 'gone'],
    ['/docs/gone?x=1', 'gone'],
    ['/docs/ok/deeper', 'ok/deeper'],
  ])('a hero button and a link row item to %s are dead links', (href, slug) => {
    const nodes = [
      hero([
        { label: 'fine', href: '/docs/ok' },
        { label: 'dead', href },
      ]),
      linkRow([{ label: 'dead', href }]),
    ]
    expect(checkPages([ok, page('other', nodes)]).errors.map(formatIssue)).toEqual([
      `other › h (hero): link /docs/${slug} points at a missing page "${slug}"`,
      `other › r (link-row): link /docs/${slug} points at a missing page "${slug}"`,
    ])
  })

  test('the same dead target twice in one block is reported once', () => {
    const items = [
      { label: 'a', href: '/docs/gone' },
      { label: 'b', href: '/docs/gone#x' },
    ]
    expect(checkPages([ok, page('other', [linkRow(items)])]).errors).toHaveLength(1)
  })

  test('items of an unexpected shape are left to the schema', () => {
    const { errors } = checkPages([ok, page('other', [linkRow('nope'), hero([null, { href: 7 }])])])

    expect(errors.length).toBeGreaterThan(0)
    for (const error of errors) expect(error.message).not.toContain('points at a missing page')
  })
})

describe('heading ids', () => {
  const heading = (id: string, text: string, anchor?: string): ComponentNode => ({
    id,
    type: 'heading',
    props: { text, level: '2', ...(anchor ? { anchor } : {}) },
  })

  test('the same text twice on a page is a duplicate id, reported on the later node', () => {
    const { errors } = checkPages([
      page('p', [heading('a', 'Props'), prose('x', 'x'), heading('b', 'Props')]),
    ])

    expect(errors.map(formatIssue)).toEqual([
      'p › b (heading): heading id "props" is already used by a; set another anchor',
    ])
  })

  test('an anchor that equals the id of another heading is a duplicate too, also in children', () => {
    const nested: ComponentNode = {
      id: 'outer',
      type: 'prose',
      props: { markdown: 'x' },
      children: [heading('c', 'Something else', 'examples')],
    }
    const { errors } = checkPages([page('p', [heading('a', 'Examples'), nested])])

    expect(errors.map((e) => e.nodeId)).toEqual(['c'])
  })

  test('an anchor tells two headings with the same text apart', () => {
    const nodes = [heading('a', 'Props'), heading('b', 'Props', 'props-of-the-hook')]
    expect(checkPages([page('p', nodes)]).errors).toEqual([])
  })

  test('the same id on two pages is fine', () => {
    const pages = [page('p', [heading('a', 'Props')]), page('q', [heading('a', 'Props')])]
    expect(checkPages(pages).errors).toEqual([])
  })

  test('a heading with invalid props has its schema error only', () => {
    const nodes = [heading('a', 'Props'), { id: 'b', type: 'heading', props: { text: 'Props' } }]
    const { errors } = checkPages([page('p', nodes)])

    expect(errors.map(formatIssue)).toEqual([expect.stringMatching(/^p › b \(heading\): level:/)])
  })
})

describe('API coverage', () => {
  const names = Object.keys(symbols)
  const withTable = page('p', [{ id: 't', type: 'props-table', props: { symbol: 'LineChart' } }])

  test('is reported without failing by default', () => {
    const { errors, coverage } = checkPages([withTable])
    expect(errors).toEqual([])
    expect(coverage.covered).toEqual(['LineChart'])
    expect(coverage.missing).toHaveLength(names.length - 1)
    expect(coverage.missing).not.toContain('LineChart')
  })

  test('covers components, functions and hooks', () => {
    const kinds = new Set(Object.values(symbols).map((s) => s.kind))
    expect(kinds).toEqual(new Set(['component', 'function', 'hook']))
  })

  test('requireCoverage turns every missing symbol into an error', () => {
    const { errors, coverage } = checkPages([withTable], { requireCoverage: true })
    expect(errors).toHaveLength(coverage.missing.length)
    expect(errors.map(formatIssue)).toContain(
      'API coverage: BarChart (component) has no PropsTable on any page',
    )
    expect(errors.map(formatIssue)).toContain(
      'API coverage: useChart (hook) has no PropsTable on any page',
    )
  })

  test('no page at all means nothing is covered', () => {
    expect(checkPages([]).coverage.missing).toEqual(names)
  })
})

describe('the real content', () => {
  test('content/ has no errors', async () => {
    const { errors } = checkPages(await pagesOf(realDir))
    expect(errors.map(formatIssue)).toEqual([])
  })
})

describe('sources', () => {
  test('without CMS_BASE_URL only the fixtures are checked', () => {
    expect(selectSources({}).map((s) => s.name)).toEqual(['fixtures'])
    expect(selectSources({ CMS_TENANT: 't' }).map((s) => s.name)).toEqual(['fixtures'])
  })

  test('with CMS_BASE_URL the CMS is checked as well, after the fixtures', () => {
    const env = { CMS_BASE_URL: 'https://cms.test', CMS_TENANT: 't', CMS_API_KEY: 'k' }
    expect(selectSources(env).map((s) => [s.name, s.source.kind])).toEqual([
      ['fixtures', 'fixtures'],
      ['cms', 'cms'],
    ])
  })

  test.each([
    [{ CMS_API_KEY: 'k' }, 'CMS_TENANT'],
    [{ CMS_TENANT: 't' }, 'CMS_API_KEY'],
    [{}, 'CMS_TENANT and CMS_API_KEY'],
  ])('CMS_BASE_URL without its siblings (%j) names %s', (rest, missing) => {
    expect(() => selectSources({ CMS_BASE_URL: 'https://cms.test', ...rest })).toThrow(
      `CMS_BASE_URL is set, but ${missing} is missing`,
    )
  })

  function fakeSource(kind: 'cms' | 'fixtures', pages: DeliveryPage[]): ContentSource {
    return {
      kind,
      getPage: async (slug) => pages.find((p) => p.slug === slug) ?? null,
      listPages: async () => pages.map((p) => ({ slug: p.slug }) as never),
      getNavigation: async () => ({ groups: [] }),
    }
  }

  test('slugs and coverage are per source, and lines are prefixed by the source', async () => {
    const link = page('a', [prose('l', '[x](/docs/b)')])
    const target = page('b', [prose('t', 'x')])
    const reports = await checkSources([
      { name: 'fixtures', source: fakeSource('fixtures', [link, target]) },
      { name: 'cms', source: fakeSource('cms', [link]) },
    ])

    expect(reports.map((r) => [r.name, r.pages, r.errors.length])).toEqual([
      ['fixtures', 2, 0],
      ['cms', 1, 1],
    ])
    expect(formatIssue(defined(defined(reports[1]).errors[0]))).toContain('/docs/b')
  })

  test('a source that fails to load is an issue, not a crash', async () => {
    const broken: ContentSource = {
      ...fakeSource('cms', []),
      listPages: async () => {
        throw new Error('401 Unauthorized')
      },
    }
    const reports = await checkSources([{ name: 'cms', source: broken }], {
      requireCoverage: true,
    })
    const report = defined(reports[0])
    expect(report.errors.map(formatIssue)).toEqual(['cannot load pages: 401 Unauthorized'])
  })

  describe('a fixture file that does not parse', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'check-content-'))
    afterAll(() => rmSync(tmp, { recursive: true, force: true }))

    test('is reported with its file name', async () => {
      writeFileSync(path.join(tmp, 'navigation.json'), '{"groups":[]}')
      writeFileSync(path.join(tmp, 'oops.json'), '{ nope')
      const report = defined((await checkSources(selectSources({}, tmp)))[0])
      expect(report.errors).toHaveLength(1)
      expect(formatIssue(defined(report.errors[0]))).toContain('oops.json')
    })
  })
})

describe('the CLI', () => {
  const tsx = path.join(appDir, 'node_modules', '.bin', 'tsx')
  const run = (...args: string[]) =>
    spawnSync(tsx, ['scripts/check-content.ts', ...args], {
      cwd: appDir,
      encoding: 'utf8',
      env: { ...process.env, CMS_BASE_URL: '', CHECK_CONTENT_REQUIRE_COVERAGE: '' },
    })

  test('exits 1 on the broken fixtures with all nine messages on stderr', () => {
    const { status, stderr } = run('--content-dir', 'lib/content/__fixtures__/broken')
    expect(status).toBe(1)
    expect(stderr).toContain('broken › bad-example (chart-example): exampleId "nope/missing"')
    expect(stderr).toContain('broken › bad-prop (heading): level:')
    expect(stderr).toContain('broken › bad-link (prose): link /docs/does-not-exist')
    expect(stderr).toContain('broken › bad-symbol (props-table): symbol "NoSuchSymbol"')
    expect(stderr).toContain('broken › bad-type (carousel): unknown block type "carousel"')
    expect(stderr).toContain('broken › bad-hero-link (hero): link /docs/no-such-hero-target')
    expect(stderr).toContain('broken › bad-row-link (link-row): link /docs/no-such-row-target')
    expect(stderr).toContain('broken › bad-heading-id (heading): heading id "same-title"')
    expect(stderr).toContain('broken › bad-anchor (heading): heading id "same-title"')
    expect(stderr).toMatch(/check:content: \d+ errors in 2 pages/)
    // The broken pages have no PropsTables, so coverage adds an error per symbol; the rest is these nine.
    const errorLines = stderr.split('\n').filter((line) => line.startsWith('fixtures: '))
    expect(errorLines.filter((line) => !line.includes('API coverage:'))).toHaveLength(9)
    expect(errorLines.some((line) => line.includes('API coverage:'))).toBe(true)
  }, 60_000)

  test('exits 0 on content/ and reports full coverage', () => {
    const { status, stdout, stderr } = run()
    expect(stderr).toBe('')
    expect(status).toBe(0)
    const total = Object.keys(symbols).length
    expect(stdout).toContain(`fixtures: API coverage: ${total}/${total}`)
    expect(stdout).not.toContain('no PropsTable for')
    expect(stdout).toContain('check:content: 0 errors')
  }, 60_000)

  test('exits 0 on content/ when coverage is required', () => {
    const { status, stderr } = run('--require-coverage')
    expect(stderr).toBe('')
    expect(status).toBe(0)
  }, 60_000)

  test.each([
    [undefined, {}],
    ['--require-coverage', {}],
    [undefined, { CHECK_CONTENT_REQUIRE_COVERAGE: '1' }],
  ])(
    'exits 1 with missing symbols, by default and when coverage is asked for (%s, %j)',
    (flag, env) => {
      const args = ['--content-dir', 'lib/content/__fixtures__/partial', ...(flag ? [flag] : [])]
      const result = spawnSync(tsx, ['scripts/check-content.ts', ...args], {
        cwd: appDir,
        encoding: 'utf8',
        env: { ...process.env, CMS_BASE_URL: '', ...env },
      })
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('API coverage: Heatmap (component) has no PropsTable')
    },
    60_000,
  )

  test('exits 1 and names the variable when CMS_TENANT is missing', () => {
    const result = spawnSync(tsx, ['scripts/check-content.ts'], {
      cwd: appDir,
      encoding: 'utf8',
      env: { ...process.env, CMS_BASE_URL: 'https://cms.test', CMS_TENANT: '', CMS_API_KEY: 'k' },
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('CMS_TENANT is missing')
  }, 60_000)
})
