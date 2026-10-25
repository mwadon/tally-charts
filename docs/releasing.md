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
through `changesets/action` and opens, or force-updates, the PR **Version Packages** on the
`changeset-release/main` branch. It bumps `packages/tally-charts/package.json`, writes
`CHANGELOG.md` and updates `.changeset/pre.json` while in pre mode. Check that the version and the
changelog read well. Edit the changesets on `main` (not in this PR) if the notes need work: the
next push regenerates the PR.

A PR opened with `GITHUB_TOKEN` does not trigger other workflows, so **CI doesn't run on the
Version PR by itself**. Close and reopen it, or push an empty commit to `changeset-release/main`,
to get the `ci.yml` checks. (The release re-runs them anyway in `verify`.)

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

1. In a PR run `pnpm changeset pre exit` and commit the change to `.changeset/pre.json`.
2. Merge it. The `version` job sees the exit and opens the Version PR with `1.0.0` (the
   changesets accumulated during pre mode are folded into it).
3. Merge that PR and approve `npm-publish` as above. `1.0.0` goes to `latest`.

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
- **Version already published**: `changeset publish` skips versions that exist on npm ("No
  unpublished projects to publish"), so a re-run after a success only does the tag and release
  steps. If the published version is wrong, don't unpublish; ship a new patch.
- **No tag or no GitHub Release**: the tag and release steps are idempotent. Re-run the `publish`
  job: publishing is skipped when the version exists, the missing tag and release are created.

## 8. Verify provenance

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
