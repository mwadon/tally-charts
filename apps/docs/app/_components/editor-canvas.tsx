'use client'

import { CMSPageEditor, VisualEditorProvider } from '@glokki-cms/react'
import { editorLayoutRegistry, editorRegistry } from '../../blocks/editor-registry'
import type { ComponentNode } from '../../lib/content'

interface EditorCanvasProps {
  componentTree: ComponentNode[]
  /** Path of the page in the site, sent to glökki in the handshake. */
  pageSlug: string
}

/**
 * The page inside the glökki visual editor. Without the `_editorOrigin` parameter the provider
 * stays out of editor mode and renders `componentTree` as given (no handshake), which is how the
 * page looks when `?_editor=1` is opened outside the glökki iframe.
 *
 * `blockRegistry` is left out on purpose: the server one pulls Shiki into the browser. The
 * handshake then lists the registered types from `editorRegistry`.
 */
export default function EditorCanvas({ componentTree, pageSlug }: EditorCanvasProps) {
  return (
    <VisualEditorProvider
      registry={editorRegistry}
      layoutRegistry={editorLayoutRegistry}
      fallbackTree={componentTree}
      pageSlug={pageSlug}
      tenantSlug={process.env.NEXT_PUBLIC_CMS_TENANT}
    >
      <CMSPageEditor />
    </VisualEditorProvider>
  )
}
