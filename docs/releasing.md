# Releasing

Releases are published from CI only: no laptop, no npm token. A maintainer approves each publish in
GitHub, npm authenticates the workflow with a short-lived OIDC token
([trusted publishing](https://docs.npmjs.com/trusted-publishers)), and every version carries a
provenance attestation. Versioning is done by [changesets](https://github.com/changesets/changesets).

## 1. Overview of the flow

```text
PR with a changeset ──merge──▶ main ──▶ release.yml / version
                                           │ pending changesets: open or update the "Version Packages" PR
                                           ▼
                          merge "Version Packages" ──▶ release.yml
                                           │ version job: no changesets, version not on npm yet
                                           ▼
                          verify (same checks as ci.yml) ──▶ publish (environment npm-publish, waits for approval)
                                           │ pnpm changeset publish (OIDC, provenance)
                                           ▼
                                  tag vX.Y.Z + GitHub Release (notes from CHANGELOG.md)
```

All of it lives in `.github/workflows/release.yml`. Runs are serialized (`concurrency: release`,
no cancelling). `workflow_dispatch` re-runs the same logic on `main`.

## 2. Add a changeset

Every PR that changes `packages/tally-charts` needs one:

```sh
pnpm changeset
```

Pick the package, the bump level and write the note for the user of the library (it ends up in
`CHANGELOG.md` and in the GitHub Release).

- `patch`: fixes, no API change.
- `minor`: new options, props, exports, tokens.
- `major`: anything that breaks the public API (see [stability](./stability.md)). The note must
  include a migration snippet, the code before and after:

  ````md
  Renamed `axis` to `yAxis`.

  ```tsx
  // before
  <LineChart axis={axis} />
  // after
  <LineChart yAxis={axis} />
  ```
  ````

Commit the generated `.changeset/*.md` file with the PR. Changes outside `packages/tally-charts`
(docs, CI, `.changeset/pre.json`) don't need one.

## 3. The Version PR

When a push to `main` leaves pending changesets, the `version` job runs `pnpm changeset version`
through `changesets/action@v2` and opens, or force-updates, the PR **Version Packages** on the
`changeset-release/main` branch. It bumps `packages/tally-charts/package.json` and writes
`CHANGELOG.md`. In pre mode the consumed changesets are moved from `.changeset/` to
`.changeset/pre/` (`@changesets/cli` 3), so they stay available for the final `1.0.0` changelog.
Check that the version and the changelog read well. Edit the changesets on `main` (not in this PR) if the notes need work: the
next push regenerates the PR.

A PR opened with `GITHUB_TOKEN` does not trigger other workflows, so **CI doesn't run on the
Version PR by itself**. Close and reopen it, or push an empty commit to `changeset-release/main`,
to get the `ci.yml` checks. (The release re-runs them anyway in `verify`.)

The action must stay on v2: v1 bundles an older changeset reader that fails on `.changeset/pre/`
once the first `rc` Version PR is merged. `scripts/release/changeset-flow.test.mjs` runs the real
CLI on a throwaway workspace (`rc.0`, then `pre exit` and `1.0.0`) to pin this layout.

## 4. Merge and approve

Merging the Version PR pushes to `main`. This time there are no pending changesets and
`tally-charts@<version>` is not on npm, so:

1. `verify` runs the same checks as the `check` job in `ci.yml`.
2. `publish` stops at the `npm-publish` environment. A required reviewer opens the run in
   **Actions → Release → Review deployments**, checks the version, and approves or rejects.
3. After approval it installs npm ≥ 11.5.1, builds, runs `pnpm changeset publish` (which runs
   `prepublishOnly`, the full check suite again), then pushes the tag `vX.Y.Z` and creates a GitHub
   Release with the matching `CHANGELOG.md` section (marked as a pre-release for versions with `-`).

The `tally-charts@x.y.z` tags that changesets creates inside the runner are not pushed; the repo
uses `vX.Y.Z`.

## 5. Prereleases (pre mode `rc`)

The repo is in changesets pre mode with tag `rc` (`.changeset/pre.json`). The next versions are
`1.0.0-rc.0`, `1.0.0-rc.1`, and so on, each through the same Version PR flow.

**They go to the dist-tag `rc`, not `next`.** The plan was `next` (SPEC D-8), but changesets 3.0.3
refuses a custom tag in pre mode: `changeset publish --tag next` fails with

```text
Releasing under custom tag is not allowed in pre mode!
To resolve this exit the pre mode by running changeset pre exit.
```

(`@changesets/cli` `dist/publish.mjs:61`). In pre mode the dist-tag is always the pre tag
(`dist/getPublishPlan.mjs:599-601`), so the fallback from D-8 applies. `latest` doesn't move.
Check after a publish:

```sh
npm view tally-charts dist-tags
# latest: '0.9.0', rc: '1.0.0-rc.0'
```

Install a release candidate with `npm i tally-charts@rc` (or an exact version).

## 6. Leave pre mode (the stable 1.0.0)

When the last release candidate is good:

1. Review `.changeset/pre/*.md`: after the exit they are the changelog entries of `1.0.0`. Delete
   the ones that should not appear. Then run `pnpm changeset pre exit` in a PR; it sets
   `"mode": "exit"` in `.changeset/pre.json`. Merge it.
2. That push has changesets again (the files in `.changeset/pre/` count once pre mode is left), so
   the `version` job opens the Version PR with `1.0.0`. Merging it deletes `.changeset/pre.json`,
   empties `.changeset/pre/` and writes the `1.0.0` section of `CHANGELOG.md`.
3. Merge that PR and approve `npm-publish` as above. `1.0.0` goes to `latest`.

The CLI side of this (`pre exit`, then `changeset version` gives `1.0.0`, `pre.json` removed) is
covered by `changeset-flow.test.mjs`. How `changesets/action@v2` treats the `exit` state has not
been run live: if the Version PR doesn't appear after step 1, run `pnpm changeset version` locally
on a branch and open the PR by hand (still merge it, never publish locally).

To keep releasing candidates after a stable release, run `pnpm changeset pre enter rc` again.

## 7. When a publish fails

Never publish from a laptop and never add a token. Fix the cause and re-run.

- **Approval rejected or timed out**: nothing was published. Re-run the `publish` job (or
  **Actions → Release → Run workflow** on `main`) and approve it.
- **`verify` or `prepublishOnly` failed**: fix on `main`; the push re-runs the workflow. The version
  isn't on npm, so `version` asks for a publish again. If the fix needs no new push, use
  **Run workflow**.
- **npm `E403` or `E404` on publish**: the OIDC exchange was refused. Check the trusted publisher
  on npmjs.com (owner `mwadon`, repo `tally-charts`, workflow `release.yml`, environment
  `npm-publish`), that the job has `id-token: write` and that npm is ≥ 11.5.1 (the job checks it).
  Re-run the job after fixing it.
- **Check provenance failed**: the version is on npm without an attestation. Check that the job
  has `id-token: write` and that the trusted publisher matches (section 9). A re-run skips the
  publish and repeats the check; if it can't be fixed, deprecate that version and ship a new patch.
- **Version already published**: `changeset publish` skips versions that exist on npm ("No
  unpublished projects to publish"), so a re-run after a success only does the tag and release
  steps. If the published version is wrong, don't unpublish; ship a new patch.
- **No tag or no GitHub Release**: the tag and release steps are idempotent. Re-run the `publish`
  job: publishing is skipped when the version exists, the missing tag and release are created.

## 8. Verify provenance

Publishing is done by `pnpm publish` (pnpm 12, called by `changeset publish`), which does the OIDC
exchange itself; the npm ≥ 11.5.1 check in the job guards the toolchain, not pnpm. So the `publish` job
has a **Check provenance** step right after publishing that fails when `npm view tally-charts@<version>
dist.attestations.url` is empty. Check by hand:

```sh
npm view tally-charts@<version> --json | grep -A3 attestations
# "dist": { ..., "attestations": { "url": ".../-/npm/v1/attestations/tally-charts@<version>", "provenance": {...} } }
```

On npmjs.com the version page shows the **Provenance** badge, linking the exact commit and workflow
run. `npm audit signatures` in a project that depends on the package verifies it too.

## 9. One-time setup [MAINTAINER]

Done once, by a repository admin and an npm owner of `tally-charts`. The workflow can't succeed
without it.

1. **Trusted publisher on npmjs.com**: package `tally-charts` → Settings → Trusted publisher →
   GitHub Actions. Organization or user `mwadon`, repository `tally-charts`, workflow filename
   `release.yml`, environment `npm-publish`.
2. **GitHub environment**: repository Settings → Environments → New environment `npm-publish`.
   Add yourself as a **required reviewer** and restrict **deployment branches** to `main`.
3. **Allow PRs from Actions**: Settings → Actions → General → Workflow permissions → enable
   **Allow GitHub Actions to create and approve pull requests**. Without it, the Version PR can't be
   opened.
4. **No secret**: don't create `NPM_TOKEN` or `NODE_AUTH_TOKEN`. `pnpm check:workflows` fails the
   build if a workflow mentions either, or sets `registry-url` in `release.yml`.
5. **Deprecate the staging placeholder**:

   ```sh
   npm deprecate tally-charts@0.0.0-stage "Placeholder from staged publishing; use a real version"
   npm view tally-charts@0.0.0-stage deprecated   # prints the message above
   ```

## 10. Docs content (seed) [MAINTAINER]

`pnpm --filter docs seed` copies the pages of `apps/docs/content/*.json` into the glökki tenant and
publishes them, so the CMS can be the source of the content of the docs site. It talks to the
glökki MCP server (`$CMS_BASE_URL/api/mcp/mcp`). Run it from your machine, never from the site's
server or from CI.

Needs, in the environment (see `apps/docs/.env.example`):

- `CMS_BASE_URL`: the address of the glökki CMS.
- `CMS_ADMIN_API_KEY`: an admin key from glökki, Settings → API Keys, with the scopes
  `mcp:connect`, `admin:pages:read`, `admin:pages:write` and `admin:pages:publish`. Without it (or
  without `CMS_BASE_URL`) the script exits with code 1 and names the missing variable, also with
  `--dry-run`: the plan is computed from what the CMS holds.

Steps:

1. **Sync the block registry**: after every deploy of the docs site that adds or changes blocks,
   open any page in the glökki visual editor once. glökki works from a stored snapshot of the
   block registry that only the editor refreshes; until then `add_block` and `publish_page`
   refuse the block types (`REGISTRY_NOT_SYNCED`, `BLOCK_TYPE_NOT_FOUND`).
2. **Check the plan**: `pnpm --filter docs seed --dry-run` prints one line per page
   (`create  /slug`, `update  /slug (blocks, seo)`, `skip    /slug (unchanged)`) and
   `seed: N create, M update, K skip`. It only reads the CMS.
3. **Seed**: `pnpm --filter docs seed`. It creates or updates the pages, then publishes each of
   them, so they show up in the delivery navigation. Publishing is limited to 10 calls a minute per
   key: the script waits out the limit and goes on, so 18 pages take over a minute.
4. **Check the content**: `CMS_BASE_URL=… CMS_TENANT=… CMS_API_KEY=… pnpm --filter docs check:content`
   (after `pnpm build`) validates the pages in the CMS the same way as the fixtures.

Running it again is safe: a page that already matches its fixture (title, the seo fields of the
fixture, the block types in order and the props of the fixture on top of the defaults of the
block, exactly) and is published is skipped, and nothing is written. A prop or a seo field that
was removed from a fixture is removed from the CMS too (a block that holds a removed prop is
rebuilt). A run that
broke half way is completed by the next one. Pages in the CMS that have no fixture are skipped
(`not in fixtures`) and never deleted (so is a page with the slug of a fixture in another locale,
listed as `/slug [locale]`), and a slug of `content/navigation.json` without a fixture is
skipped as `no fixture`. The labels, groups and order of the sidebar stay in
`content/navigation.json`; the seed doesn't touch the menu of the layout.

## 11. Docs on Vercel [MAINTAINER]

Hosts `apps/docs` on Vercel with the content from glökki, a preview deploy for every PR and a
webhook that refreshes the site when a page is published. Done once, by the owner of the Vercel
project. Everything the build needs is in `apps/docs/vercel.json` (framework, install and build
command); it holds no secret and no value of any variable.

1. **Import the repository**: Vercel → Add New → Project → GitHub → `mwadon/tally-charts`. Then in
   the project settings:
   - **Root Directory**: `apps/docs`, with **Include files outside the root directory in the Build
     Step** turned on (the build needs the whole workspace: `packages/tally-charts` and the root
     lockfile).
   - **Node.js Version**: `24.x` (Settings → Build and Deployment), the same as CI.
   - **Framework Preset, Install Command and Build Command**: don't override them in the UI. They
     come from `apps/docs/vercel.json`: `pnpm install --frozen-lockfile`, then
     `pnpm --filter tally-charts build && pnpm --filter docs build` (the library goes first, because
     the docs resolve `tally-charts` to its `dist`). If a field shows "Override" turned on, turn it
     off.
2. **Environment variables** (Settings → Environment Variables). Names and meaning:
   `apps/docs/.env.example`.

   | Variable                 | Production                      | Preview                          | Notes                                                                                  |
   | ------------------------ | ------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
   | `CMS_BASE_URL`           | address of glökki               | the same                         | Without it the site reads the JSON fixtures, not the CMS.                              |
   | `CMS_TENANT`             | tenant slug                     | the same                         | Sent as `X-Tenant-Slug`.                                                               |
   | `CMS_API_KEY`            | delivery key of the tenant      | the same                         | Server only: don't prefix it with `NEXT_PUBLIC_`.                                      |
   | `NEXT_PUBLIC_CMS_TENANT` | tenant slug                     | the same                         | Read by the visual editor in the browser.                                              |
   | `REVALIDATE_SECRET`      | random                          | a different random value         | `openssl rand -hex 32`. Separate for Production and Preview.                           |
   | `PREVIEW_SECRET`         | random                          | a different random value         | `openssl rand -hex 32`. Separate for Production and Preview.                           |
   | `SITE_URL`               | the production URL of the site  | the same production URL          | Canonical links, Open Graph and `sitemap.xml`. Without it they point at `localhost:3100`. |
   | `APP_ENV`                | `production`                    | leave empty (don't set it)       | Only `production` allows indexing; see step 3.                                         |

   `CMS_ADMIN_API_KEY` never goes to Vercel: it is for `pnpm --filter docs seed` and lives only on
   the maintainer's machine (§10).
3. **Preview deploys**: Vercel builds every PR with the Preview values. Without `APP_ENV=production`
   the site sends `noindex`, `robots.txt` answers `Disallow: /` and block errors are visible, so a
   preview is never indexed and shows what is broken. `SITE_URL` stays the production URL there
   on purpose (the code doesn't read `VERCEL_URL`). Optionally turn on Deployment Protection
   (Settings → Deployment Protection) so that only the team opens the previews.
4. **Webhook from glökki**: in the tenant's webhooks add, for the publish event,
   `POST https://<domain>/api/revalidate` with the header `Authorization: Bearer <REVALIDATE_SECRET>`
   (or `x-revalidate-secret: <REVALIDATE_SECRET>`) of Production. Check it by hand:

   ```sh
   curl -i -X POST https://<domain>/api/revalidate -H "Authorization: Bearer $REVALIDATE_SECRET"
   # 200 {"revalidated":true}
   curl -i -X POST https://<domain>/api/revalidate
   # 401 {"revalidated":false}
   ```

   Then change a text on a page in glökki, publish it and check that the change is visible on the
   production site within 60 seconds.
5. **Draft preview**: in glökki set the preview URL to `https://<domain>/preview?slug=<slug>` (the
   slug `home` opens `/`, any other `/docs/<slug>`), sending `PREVIEW_SECRET` in
   `Authorization: Bearer`, in `x-preview-secret` or as `?secret=`. A wrong secret answers 401, an
   unknown slug 400. After the seed (§10) open the visual editor once to sync the block registry.
6. **Check the domain**: the changesets link `https://tally-charts.vercel.app/docs/migration-1-0`
   (`grep -l 'tally-charts.vercel.app' .changeset/*.md` lists three of them). The production URL of
   the project must be exactly `https://tally-charts.vercel.app`. If it is another one:
   - replace the address in those changesets (a PR that changes no file in `packages/`),
   - set `SITE_URL` to the new address in Production and Preview,
   - update the address in `PROGRESS.md` and `CLAUDE.md` where it is mentioned,
   - redeploy the project so the new `SITE_URL` takes effect.
