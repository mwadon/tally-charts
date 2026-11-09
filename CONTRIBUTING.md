# Contributing

Bug reports and pull requests are welcome. For a larger change, open an issue first so the
direction can be agreed before you write the code.

## Setup

Node 24 and pnpm (the version in `packageManager`; `corepack enable` picks it up).

```bash
pnpm install
pnpm --filter storybook-app dev   # Storybook on port 6006
```

## Before you open a pull request

```bash
pnpm lint          # pnpm format fixes what can be fixed
pnpm typecheck
pnpm build
pnpm test
pnpm --filter tally-charts api:check
pnpm size
```

- **Tests.** Every new function and every bug fix comes with a test.
- **Changeset.** A pull request that changes `packages/tally-charts` needs one: run
  `pnpm changeset`. A breaking change is `major` and its text shows the code before and after.
- **Public API.** `api:check` fails when the exported API changed. If the change is intended, run
  `pnpm build && pnpm --filter tally-charts api:update` and commit the files in
  `packages/tally-charts/api`.
- **Bundle size.** `pnpm size` enforces a limit per chart. Don't raise a limit without saying why
  in the pull request.
- **Screenshots.** Visual baselines are kept per platform in `apps/storybook/e2e/__screenshots__`
  and `apps/docs/e2e/__screenshots__`. CI never writes them. If your change alters how a chart
  looks, say so in the pull request; the Linux baselines are regenerated with the Docker command
  in the comments of `.github/workflows/ci.yml`.
- **Strings.** User-visible text in the library goes through `src/react/messages.ts` so
  applications can translate it.

## Releases

Maintainers release from CI; see [docs/releasing.md](docs/releasing.md).
