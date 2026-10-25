import { createBlockRegistry } from '@glokki-cms/sdk'
import type { z } from 'zod'
import { calloutBlock, calloutSchema } from './callout'
import { codeBlockBlock, codeBlockSchema } from './code-block'
import { headingBlock, headingSchema } from './heading'
import { proseBlock, proseSchema } from './prose'

export const blockRegistry = createBlockRegistry([
  proseBlock,
  headingBlock,
  calloutBlock,
  codeBlockBlock,
])

/** `defineBlock` drops the Zod schema (it keeps only `fields`), so the schemas live here too. */
export const blockSchemas = {
  prose: proseSchema,
  heading: headingSchema,
  callout: calloutSchema,
  'code-block': codeBlockSchema,
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
