import { expect, test } from 'vitest'
import { blockRegistry, blockSchemas, parseBlockProps } from './registry'

const types = [
  'prose',
  'heading',
  'callout',
  'code-block',
  'chart-example',
  'props-table',
  'token-table',
  'palette-swatches',
]

test('the registry has the eight content blocks, in order', () => {
  expect(blockRegistry.getTypes()).toEqual(types)
  for (const type of types) expect(blockRegistry.getComponent(type)).toBeDefined()
})

test('serialized definitions survive JSON and have fields for every block', () => {
  const definitions = blockRegistry.getSerializedDefinitions()

  expect(JSON.parse(JSON.stringify(definitions))).toEqual(definitions)
  expect(definitions.map((d) => d.type)).toEqual(types)
  for (const d of definitions) {
    expect(d.fields.length).toBeGreaterThan(0)
    expect(d.category).toBe('content')
  }
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
