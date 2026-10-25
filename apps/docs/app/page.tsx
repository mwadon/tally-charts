import { CMSPage } from '@glokki-cms/react'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { componentRegistry } from '../blocks/registry'
import { getContentSource } from '../lib/content'
import { pageMetadata } from '../lib/metadata'
import { EditorSwitch } from './_components/editor-switch'
import { PreviewNotice } from './_components/preview-notice'
import { SiteHeader } from './_components/site-header'

async function loadHome() {
  const { isEnabled } = await draftMode()
  const page = await getContentSource(process.env, isEnabled).getPage('home')
  return { page, isEnabled }
}

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await loadHome()
  return page ? pageMetadata(page, '/') : {}
}

export default async function Home() {
  const { page, isEnabled } = await loadHome()
  if (!page) notFound()

  return (
    <>
      {isEnabled ? <PreviewNotice /> : null}
      <SiteHeader />
      <main id="main" className="home">
        <EditorSwitch componentTree={page.componentTree} pageSlug="/">
          <CMSPage componentTree={page.componentTree} registry={componentRegistry} />
        </EditorSwitch>
      </main>
      <footer className="site-footer">
        <p>tally-charts · MIT</p>
      </footer>
    </>
  )
}
