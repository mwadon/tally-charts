'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, useSyncExternalStore } from 'react'
import type { ComponentNode } from '../../lib/content'
import { editorOrigins } from '../../lib/editor-origin'

// Loaded only with ?_editor=1, so readers never download the editor.
const EditorCanvas = dynamic(() => import('./editor-canvas'))

// The names the SDK reads from the URL (EDITOR_QUERY_PARAM, EDITOR_ORIGIN_QUERY_PARAM; a test
// keeps them equal). Literals, so readers do not download the SDK for two strings.
export const EDITOR_PARAM = '_editor'
export const EDITOR_ORIGIN_PARAM = '_editorOrigin'

/**
 * Whether `search` asks for the editor canvas and may get it. With `_editorOrigin` the SDK takes
 * `tree:update` messages from that origin and renders the blocks they carry, and the origin comes
 * from the URL, so it has to be one of `allowed` (`NEXT_PUBLIC_CMS_EDITOR_ORIGIN`); any other
 * value keeps the server content. Without `_editorOrigin` the SDK stays out of editor mode: no
 * handshake and no message listener, only the page's own tree through the editor registry.
 */
export function wantsEditor(search: string, allowed: readonly string[]) {
  const params = new URLSearchParams(search)
  if (params.get(EDITOR_PARAM) !== '1') return false
  const origin = params.get(EDITOR_ORIGIN_PARAM)
  return !origin || allowed.includes(origin)
}

const subscribe = () => () => {}
const isEditor = () => wantsEditor(window.location.search, editorOrigins())
const isEditorOnServer = () => false

interface EditorSwitchProps {
  /** The server-rendered page content, shown unless the page is opened with `?_editor=1`. */
  children: ReactNode
  componentTree: ComponentNode[]
  pageSlug: string
}

/**
 * Swaps the server-rendered content for the visual editor canvas when the URL has `?_editor=1`
 * (and, if it names an `_editorOrigin`, an allowed one; see `wantsEditor`). The query is read in
 * the browser, so the pages stay static: the server and the first client render always show
 * `children`.
 */
export function EditorSwitch({ children, componentTree, pageSlug }: EditorSwitchProps) {
  const editing = useSyncExternalStore(subscribe, isEditor, isEditorOnServer)
  return editing ? <EditorCanvas componentTree={componentTree} pageSlug={pageSlug} /> : children
}
