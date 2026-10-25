import type { ComponentNode } from './types'

/** The block whose first occurrence on a page is rendered at once, not on scroll. */
const EAGER_TYPE = 'chart-example'

/**
 * Returns a copy of `tree` whose first `chart-example` node (depth first, in document order,
 * hidden nodes skipped because they are not rendered) has `props.eager = true`. The input is
 * not mutated and unchanged subtrees are shared with it. The first card is usually in the
 * first screenful and stays in the server HTML; `ChartExampleBlock` mounts the others lazily.
 * `eager` is not in the block's schema, so editors, seed and `check:content` never see it.
 */
export function markEagerExamples(tree: ComponentNode[]): ComponentNode[] {
  let found = false

  const visit = (nodes: ComponentNode[]): ComponentNode[] => {
    let changed = false
    const next = nodes.map((node) => {
      if (found || node.hidden) return node
      if (node.type === EAGER_TYPE) {
        found = true
        changed = true
        return { ...node, props: { ...node.props, eager: true } }
      }
      if (!node.children) return node
      const children = visit(node.children)
      if (children === node.children) return node
      changed = true
      return { ...node, children }
    })
    return changed ? next : nodes
  }

  return visit(tree)
}
