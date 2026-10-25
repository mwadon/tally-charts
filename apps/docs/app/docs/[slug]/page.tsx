import { CMSPage } from '@glokki-cms/react'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { collectToc } from '../../../blocks/heading'
import { componentRegistry } from '../../../blocks/registry'
import { getContentSource } from '../../../lib/content'
import { markEagerExamples } from '../../../lib/content/eager'
import { pageMetadata } from '../../../lib/metadata'
import { EditorSwitch } from '../../_components/editor-switch'
import { PreviewNotice } from '../../_components/preview-notice'
import { TocColumn, TocInline } from '../../_components/toc'
import { docHref } from '../../_content/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * The source for this request: drafts in draft mode (`/preview`), published pages otherwise.
 * `/docs/home` is not a route, the home page lives at `/`.
 */
async function loadPage(slug: string) {
  const { isEnabled } = await draftMode()
  const source = getContentSource(process.env, isEnabled)
  return { source, isEnabled, page: slug === 'home' ? null : await source.getPage(slug) }
}

export async function generateStaticParams() {
  const pages = await getContentSource().listPages()
  return pages.filter((page) => page.slug !== 'home').map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { page } = await loadPage(slug)
  return page ? pageMetadata(page, docHref(slug)) : {}
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params
  const { page, source, isEnabled } = await loadPage(slug)
  if (!page) notFound()

  const { groups } = await source.getNavigation()
  const group = groups.find((g) => g.items.some((item) => item.slug === slug))
  const toc = collectToc(page.componentTree)

  return (
    <div className="doc-body">
      {isEnabled ? <PreviewNotice /> : null}
      <TocInline items={toc} />
      <article className="doc">
        {group ? <p className="eyebrow">{group.label}</p> : null}
        <h1>{page.title}</h1>
        <EditorSwitch componentTree={page.componentTree} pageSlug={docHref(slug)}>
          <CMSPage
            componentTree={markEagerExamples(page.componentTree)}
            registry={componentRegistry}
          />
        </EditorSwitch>
      </article>
      <TocColumn items={toc} />
    </div>
  )
}
