import { CMSPage } from '@glokki-cms/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { collectToc } from '../../../blocks/heading'
import { componentRegistry } from '../../../blocks/registry'
import { getContentSource } from '../../../lib/content'
import { pageMetadata } from '../../../lib/metadata'
import { TocColumn, TocInline } from '../../_components/toc'
import { docHref } from '../../_content/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

/** The home page lives at `/`, so `/docs/home` is not a route. */
async function loadPage(slug: string) {
  return slug === 'home' ? null : getContentSource().getPage(slug)
}

export async function generateStaticParams() {
  const pages = await getContentSource().listPages()
  return pages.filter((page) => page.slug !== 'home').map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await loadPage(slug)
  return page ? pageMetadata(page, docHref(slug)) : {}
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params
  const page = await loadPage(slug)
  if (!page) notFound()

  const { groups } = await getContentSource().getNavigation()
  const group = groups.find((g) => g.items.some((item) => item.slug === slug))
  const toc = collectToc(page.componentTree)

  return (
    <div className="doc-body">
      <TocInline items={toc} />
      <article className="doc">
        {group ? <p className="eyebrow">{group.label}</p> : null}
        <h1>{page.title}</h1>
        <CMSPage componentTree={page.componentTree} registry={componentRegistry} />
      </article>
      <TocColumn items={toc} />
    </div>
  )
}
