'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, useSyncExternalStore } from 'react'
import type { ComponentNode } from '../../lib/content'

// Loaded only with ?_editor=1, so readers never download the editor.
const EditorCanvas = dynamic(() => import('./editor-canvas'))

const subscribe = () => () => {}
const isEditor = () => new URLSearchParams(window.location.search).get('_editor') === '1'
const isEditorOnServer = () => false

interface EditorSwitchProps {
  /** The server-rendered page content, shown unless the page is opened with `?_editor=1`. */
  children: ReactNode
  componentTree: ComponentNode[]
  pageSlug: string
}

/**
 * Swaps the server-rendered content for the visual editor canvas when the URL has `?_editor=1`.
 * The query is read in the browser, so the pages stay static: the server and the first client
 * render always show `children`.
 */
export function EditorSwitch({ children, componentTree, pageSlug }: EditorSwitchProps) {
  const editing = useSyncExternalStore(subscribe, isEditor, isEditorOnServer)
  return editing ? <EditorCanvas componentTree={componentTree} pageSlug={pageSlug} /> : children
}
