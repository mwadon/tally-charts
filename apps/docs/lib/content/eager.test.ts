import { expect, test } from 'vitest'
import { markEagerExamples } from './eager'
import type { ComponentNode } from './types'

const chart = (id: string, extra: Partial<ComponentNode> = {}): ComponentNode => ({
  id,
  type: 'chart-example',
  props: { exampleId: 'line-chart/revenue-forecast', defaultView: 'preview' },
  ...extra,
})
const prose = (id: string): ComponentNode => ({ id, type: 'prose', props: { markdown: 'x' } })
const eagerIds = (tree: ComponentNode[]): string[] =>
  tree.flatMap((n) => [...(n.props.eager === true ? [n.id] : []), ...eagerIds(n.children ?? [])])

test('only the first chart-example gets eager', () => {
  const result = markEagerExamples([prose('a'), chart('b'), chart('c'), chart('d')])

  expect(eagerIds(result)).toEqual(['b'])
  expect(result[1]?.props).toEqual({ ...chart('b').props, eager: true })
})

test('does not mutate the input', () => {
  const tree = [prose('a'), chart('b'), chart('c')]
  const snapshot = structuredClone(tree)

  const result = markEagerExamples(tree)

  expect(tree).toEqual(snapshot)
  expect(result).not.toBe(tree)
  expect(result[1]).not.toBe(tree[1])
  expect(result[1]?.props).not.toBe(tree[1]?.props)
})

test('a tree without chart-example comes back unchanged', () => {
  const tree = [prose('a'), { ...prose('b'), children: [prose('c')] }]

  expect(markEagerExamples(tree)).toBe(tree)
  expect(markEagerExamples([])).toEqual([])
})

test('finds the first chart-example inside children, in document order', () => {
  const tree: ComponentNode[] = [
    prose('a'),
    { id: 'col', type: 'columns', props: {}, children: [prose('x'), chart('inner'), chart('i2')] },
    chart('after'),
  ]

  const result = markEagerExamples(tree)

  expect(eagerIds(result)).toEqual(['inner'])
  expect(tree[1]?.children?.[1]?.props.eager).toBeUndefined()
})

test('a chart-example before a container with charts wins over the nested ones', () => {
  const tree: ComponentNode[] = [
    chart('first'),
    { id: 'col', type: 'columns', props: {}, children: [chart('inner')] },
  ]

  expect(eagerIds(markEagerExamples(tree))).toEqual(['first'])
})

test('a hidden chart-example is skipped, because it is not rendered', () => {
  const tree = [chart('hidden', { hidden: true }), chart('shown')]

  expect(eagerIds(markEagerExamples(tree))).toEqual(['shown'])
})
