import { PreviewBanner } from '@glokki-cms/react'

/**
 * The SDK banner is `position: fixed; top: 0` and would cover the sticky header, so the wrapper
 * puts it back into the document flow (`.preview-banner-slot` in globals.css).
 */
export function PreviewNotice() {
  return (
    <div className="preview-banner-slot">
      <PreviewBanner />
    </div>
  )
}
