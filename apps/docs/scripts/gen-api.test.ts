import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeAll, expect, test } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { collectApi, generate, parseDefault } from './gen-api.mjs'

interface Field {
  name: string
  type: string
  required: boolean
  default: string | null
  description: string
}
interface ApiSymbol {
  name: string
  kind: 'component' | 'function' | 'hook'
  package: string
  packages: string[]
  description: string
  props?: Field[]
  params?: Field[]
  returns?: string
}

const repo = path.resolve(__dirname, '../../..')
const modelDir = path.join(repo, 'packages/tally-charts/api')
const srcDir = path.join(repo, 'packages/tally-charts/src')

let symbols: Record<string, ApiSymbol>

beforeAll(() => {
  symbols = collectApi({ modelDir, srcDir }).symbols
}, 60_000)

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const field = (list: Field[] | undefined, name: string) => list?.find((f) => f.name === name)

test('RankedBars is a component with the documented default of fill', () => {
  const ranked = symbols.RankedBars
  expect(ranked?.kind).toBe('component')
  expect(ranked?.package).toBe('tally-charts')
  const fill = field(ranked?.props, 'fill')
  expect(fill).toMatchObject({ type: 'PerItem<D, Fill>', required: false, default: "'solid'" })
  expect(fill?.description).toContain("Use 'hatch'")
})

test('LineChart props come from the expanded type, not from the destructured parameter', () => {
  const props = symbols.LineChart?.props ?? []
  expect(field(props, 'data')).toMatchObject({ required: true, type: 'readonly D[]' })
  expect(field(props, 'band')?.description).toBe(
    'A soft band between two values, e.g. the likely range of a forecast.',
  )
  expect(field(props, 'title')?.required).toBe(false)
  expect(field(props, 'title')?.type).toBe('string')
  expect(field(props, 'title')?.description).toContain('Accessible name')
  expect(field(props, 'aria-labelledby')?.required).toBe(false)
  expect(field(props, 'aspectRatio')).toBeUndefined()
  expect(field(props, 'height')).toBeDefined()
  expect(props.filter((p) => p.name.startsWith('{'))).toEqual([])
  expect(props.map((p) => p.name)).toEqual([...props.map((p) => p.name)].sort())
})

test('createFormatter lists its parameters with types, defaults and @param text', () => {
  const create = symbols.createFormatter
  expect(create).toMatchObject({
    kind: 'function',
    package: 'tally-charts',
    packages: ['tally-charts', 'tally-charts/core'],
    returns: 'Formatter',
  })
  expect(create?.params?.map((p) => p.name)).toEqual(['spec', 'options'])
  const [spec, options] = create?.params ?? []
  expect(spec).toMatchObject({ type: 'FormatSpec', required: false, default: "'number'" })
  expect(spec?.description).toMatch(/^What to write/)
  expect(options).toMatchObject({ type: 'FormatOptions', required: false, default: '{}' })
  expect(options?.description).not.toBe('')
})

test('kinds and packages', () => {
  expect(symbols.useFormat?.kind).toBe('hook')
  expect(symbols.createDateFormatter?.package).toBe('tally-charts/core')
  expect(symbols.createDateFormatter?.packages).toEqual(['tally-charts/core'])
})

test('a link in a description is plain text', () => {
  const links = Object.values(symbols)
    .flatMap((s) => [...(s.props ?? []), ...(s.params ?? [])])
    .filter((f) => f.description.includes('{@link'))
  expect(links).toEqual([])
})

test('the symbols are exactly the Function members of both api models', () => {
  const names = ['tally-charts', 'core'].flatMap((model) =>
    JSON.parse(readFileSync(path.join(modelDir, `${model}.api.json`), 'utf8'))
      .members[0].members.filter((m: { kind: string }) => m.kind === 'Function')
      .map((m: { name: string }) => m.name),
  )
  expect(Object.keys(symbols).sort()).toEqual([...new Set<string>(names)].sort())
  expect(symbols.TONES).toBeUndefined()
  expect(symbols.LineChartProps).toBeUndefined()
})

test('every prop and param has the five fields', () => {
  for (const symbol of Object.values(symbols)) {
    for (const f of [...(symbol.props ?? []), ...(symbol.params ?? [])]) {
      expect(Object.keys(f).sort(), symbol.name).toEqual([
        'default',
        'description',
        'name',
        'required',
        'type',
      ])
      expect(typeof f.required).toBe('boolean')
      expect(f.default === null || typeof f.default === 'string').toBe(true)
    }
  }
})

test.each([
  ['Default 0.35.', '0.35'],
  ["Default: history 'hatch-fade', last bar 'solid'.", "history 'hatch-fade', last bar 'solid'"],
  ['Defaults to true for `pts`.', 'true for `pts`'],
  ['Default false: one area per series.', 'false'],
  ["Default 'solid'. Use 'hatch' for a plan.", "'solid'"],
  ['Show a sign. Default 640; wider is fine.', '640'],
  ['Default: a `a: b` pair. More.', 'a `a: b` pair'],
])('parseDefault(%j) is %j', (description, expected) => {
  expect(parseDefault(description, [])).toBe(expected)
})

test('parseDefault is null without a default and prefers @defaultValue', () => {
  expect(parseDefault('Height in px.', [])).toBeNull()
  expect(parseDefault('The default of this is unknown.', [])).toBeNull()
  expect(parseDefault('Default 1.', [{ name: 'defaultValue', text: '2' }])).toBe('2')
  expect(parseDefault('', [{ name: 'defaultValue', text: [{ kind: 'text', text: '3' }] }])).toBe(
    '3',
  )
})

test('generate writes once and leaves an unchanged file alone', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'gen-api-'))
  dirs.push(root)
  // generate(root) reads ../../packages/tally-charts relative to root: mirror the repo layout.
  const app = path.join(root, 'apps/docs')
  mkdirSync(app, { recursive: true })
  mkdirSync(path.join(root, 'packages'), { recursive: true })
  const link = path.join(root, 'packages/tally-charts')
  symlinkSync(path.join(repo, 'packages/tally-charts'), link)
  symlinkSync(path.join(repo, 'tsconfig.base.json'), path.join(root, 'tsconfig.base.json'))

  expect(generate(app)).toBe(true)
  const file = path.join(app, 'api.generated.json')
  const past = new Date(Date.now() - 60_000)
  utimesSync(file, past, past)
  const before = statSync(file).mtimeMs
  expect(generate(app)).toBe(false)
  expect(statSync(file).mtimeMs).toBe(before)
}, 60_000)

test('a missing api model names the command that creates it', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'gen-api-'))
  dirs.push(root)
  mkdirSync(path.join(root, 'src/core'), { recursive: true })
  writeFileSync(path.join(root, 'src/index.ts'), 'export {}\n')
  writeFileSync(path.join(root, 'src/core/index.ts'), 'export {}\n')
  expect(() =>
    collectApi({ modelDir: path.join(root, 'api'), srcDir: path.join(root, 'src') }),
  ).toThrow(/api:update/)
})

test('a function missing from the model, or only in the model, fails with `symbol: problem`', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'gen-api-'))
  dirs.push(root)
  mkdirSync(path.join(root, 'src/core'), { recursive: true })
  mkdirSync(path.join(root, 'api'))
  writeFileSync(path.join(root, 'src/index.ts'), 'export function added(): void {}\n')
  writeFileSync(path.join(root, 'src/core/index.ts'), 'export {}\n')
  const model = (names: string[]) =>
    JSON.stringify({
      members: [{ kind: 'EntryPoint', members: names.map((name) => ({ kind: 'Function', name })) }],
    })
  writeFileSync(path.join(root, 'api/tally-charts.api.json'), model(['removed']))
  writeFileSync(path.join(root, 'api/core.api.json'), model([]))
  expect(() =>
    collectApi({ modelDir: path.join(root, 'api'), srcDir: path.join(root, 'src') }),
  ).toThrow(
    /added: exported from src\/index\.ts[\s\S]*removed: in tally-charts\.api\.json but not exported/,
  )
})
