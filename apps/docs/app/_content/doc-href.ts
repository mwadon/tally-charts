/** Kept apart from navigation.ts so client components do not pull package.json into the bundle. */
export const docHref = (slug: string) => `/docs/${slug}`
