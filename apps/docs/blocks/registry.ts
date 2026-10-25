import type { ComponentRegistry } from '@glokki-cms/react'
import { createBlockRegistry } from '@glokki-cms/sdk'
import type { ComponentType } from 'react'
import type { z } from 'zod'
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

/** The registry in the shape `CMSPage` takes: block type → component. */
export const componentRegistry: ComponentRegistry = new Map(
  blockRegistry.getTypes().flatMap((type) => {
    const component = blockRegistry.getComponent(type) as ComponentType<Record<string, unknown>>
    return [[type, component] as const]
  }),
)
