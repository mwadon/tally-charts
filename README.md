# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, coral means loss, and targets are first-class.

```bash
npm i tally-charts
```

- Documentation, live examples and the API: <https://tally-charts-docs.vercel.app>
- Package README: [packages/tally-charts/README.md](packages/tally-charts/README.md)
- Changelog: [packages/tally-charts/CHANGELOG.md](packages/tally-charts/CHANGELOG.md)
- Stability policy: [docs/stability.md](docs/stability.md)

## Repository

| Path | What it is |
|---|---|
| `packages/tally-charts` | The library published to npm |
| `apps/docs` | The documentation site (Next.js) |
| `apps/storybook` | Stories and the visual regression tests |
| `docs` | Release process, stability policy, accessibility notes |

## Development

Requires Node 24 and pnpm (the version in `packageManager`; `corepack enable` picks it up).

```bash
pnpm install
pnpm --filter storybook-app dev   # Storybook on port 6006
pnpm test                         # unit tests of the library
pnpm lint && pnpm typecheck
pnpm build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and
[SECURITY.md](SECURITY.md) to report a vulnerability.

MIT licensed.
