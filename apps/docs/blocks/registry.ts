import type { ComponentRegistry } from '@glokki-cms/react'
import { createBlockRegistry } from '@glokki-cms/sdk'
import { type ComponentType, createElement } from 'react'
import type { z } from 'zod'
import { blockError } from './block-error'
import { calloutBlock, calloutSchema } from './callout'
import { chartExampleBlock, chartExampleSchema } from './chart-example'
import { codeBlockBlock, codeBlockSchema } from './code-block'
import { featureGridBlock, featureGridSchema } from './feature-grid'
import { galleryBlock, gallerySchema } from './gallery'
import { headingBlock, headingSchema } from './heading'
import { heroBlock, heroSchema } from './hero'
import { installBlock, installSchema } from './install'
import { linkRowBlock, linkRowSchema } from './link-row'
import { paletteSwatchesBlock, paletteSwatchesSchema } from './palette-swatches'
import { propsTableBlock, propsTableSchema } from './props-table'
import { proseBlock, proseSchema } from './prose'
import { tokenTableBlock, tokenTableSchema } from './token-table'
import { visualLanguageBlock, visualLanguageSchema } from './visual-language'

/**
 * `content` is the docs vocabulary, `home` the blocks a home page is assembled from. Declaring the
 * categories is what makes `home` a group of its own in the picker.
 */
export const blockRegistry = createBlockRegistry(
  [
    proseBlock,
    headingBlock,
    calloutBlock,
    codeBlockBlock,
    chartExampleBlock,
    propsTableBlock,
    tokenTableBlock,
    paletteSwatchesBlock,
    heroBlock,
    visualLanguageBlock,
    galleryBlock,
    installBlock,
    featureGridBlock,
    linkRowBlock,
  ],
  {
    categories: [
      { key: 'content', label: 'Content' },
      { key: 'home', label: 'Home page' },
    ],
  },
)

/** `defineBlock` drops the Zod schema (it keeps only `fields`), so the schemas live here too. */
export const blockSchemas = {
  prose: proseSchema,
  heading: headingSchema,
  callout: calloutSchema,
  'code-block': codeBlockSchema,
  'chart-example': chartExampleSchema,
  'props-table': propsTableSchema,
  'token-table': tokenTableSchema,
  'palette-swatches': paletteSwatchesSchema,
  hero: heroSchema,
  'visual-language': visualLanguageSchema,
  gallery: gallerySchema,
  install: installSchema,
  'feature-grid': featureGridSchema,
  'link-row': linkRowSchema,
} satisfies Record<string, z.ZodObject>

export type BlockType = keyof typeof blockSchemas

function isBlockType(type: string): type is BlockType {
  return Object.hasOwn(blockSchemas, type)
}

/** `safeParse` of the props against the schema of `type`; an unknown type is an error result. */
export function parseBlockProps(type: string, props: unknown) {
  if (!isBlockType(type)) {
    return {
      success: false as const,
      error: new Error(`Unknown block type: ${type}`),
    }
  }
  return blockSchemas[type].safeParse(props)
}

export interface SchemaIssue {
  code: string
  path: PropertyKey[]
  message: string
  values?: unknown[]
}

/** Up to this many enum options are listed in a message; more would bury the point. */
const MAX_LISTED_VALUES = 4

/** `path: what is wrong`, with a long enum summarised instead of listed. */
export function describeSchemaIssue(issue: SchemaIssue) {
  const where = issue.path.length > 0 ? issue.path.map(String).join('.') : 'props'
  if (issue.code === 'invalid_value' && issue.values) {
    const { values } = issue
    const expected =
      values.length <= MAX_LISTED_VALUES
        ? `expected one of ${values.map((v) => JSON.stringify(v)).join(', ')}`
        : `expected one of ${values.length} values`
    return `${where}: ${expected}`
  }
  return `${where}: ${issue.message}`
}

/**
 * References that the blocks check themselves, against the registry of examples or symbols: an
 * id that no longer exists gets their clearer message (`Unknown example: …`) instead of an enum
 * error here.
 */
const SELF_CHECKED = new Set(['exampleId', 'symbol'])

function valueAt(props: unknown, path: readonly PropertyKey[]) {
  return path.reduce<unknown>(
    (value, key) =>
      typeof value === 'object' && value !== null && Object.hasOwn(value, key)
        ? (value as Record<PropertyKey, unknown>)[key]
        : undefined,
    props,
  )
}

/** What is wrong with `props` for a block of `type`, one line per problem; empty when they fit. */
export function invalidBlockProps(type: string, props: unknown): string[] {
  const result = parseBlockProps(type, props)
  if (result.success) return []
  const issues = (result.error as { issues?: SchemaIssue[] }).issues
  if (!issues) return [result.error.message]
  return issues
    .filter((issue) => {
      const name = issue.path.at(-1)
      const selfChecked = typeof name === 'string' && SELF_CHECKED.has(name)
      return !(
        selfChecked &&
        issue.code === 'invalid_value' &&
        typeof valueAt(props, issue.path) === 'string'
      )
    })
    .map(describeSchemaIssue)
}

type BlockComponent = ComponentType<Record<string, unknown>>

/**
 * The component of `type` behind a check of its props. Content from glokki is not validated on
 * the way in, and a block that got a missing array or an unknown `lang` would throw and fail the
 * whole page (and its regeneration); it renders `blockError` instead: a box outside production
 * and in draft mode, nothing on the live site. The props are handed on as they came, so what the
 * schema does not know (`eager`, children) still reaches the block.
 */
function guarded(type: string, Component: BlockComponent): BlockComponent {
  function GuardedBlock(props: Record<string, unknown>) {
    const problems = invalidBlockProps(type, props)
    if (problems.length > 0) return blockError(`Invalid props of ${type}: ${problems.join('; ')}`)
    return createElement(Component, props)
  }
  GuardedBlock.displayName = `Guarded(${type})`
  return GuardedBlock as BlockComponent
}

/** The registry in the shape `CMSPage` takes: block type → component, each behind `guarded`. */
export const componentRegistry: ComponentRegistry = new Map(
  blockRegistry.getTypes().flatMap((type) => {
    const component = blockRegistry.getComponent(type) as BlockComponent
    return [[type, guarded(type, component)] as const]
  }),
)
