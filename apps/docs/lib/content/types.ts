import type { DeliveryPage, DeliveryPageListItem } from '@glokki-cms/sdk'

export type { ComponentNode, DeliveryPage, DeliveryPageListItem } from '@glokki-cms/sdk'

export interface NavigationItem {
  label: string
  slug: string
  /** Whether a page exists behind the slug; the sidebar shows the others as "soon". */
  available: boolean
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export interface Navigation {
  groups: NavigationGroup[]
}

/** Where page content comes from: the glökki CMS in production, JSON fixtures everywhere else. */
export interface ContentSource {
  kind: 'cms' | 'fixtures'
  /** The published page, or `null` when there is none for `slug`. */
  getPage(slug: string): Promise<DeliveryPage | null>
  listPages(): Promise<DeliveryPageListItem[]>
  getNavigation(): Promise<Navigation>
}
