# Development

Requires Node.js 24 or newer.

```sh
npm ci
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. The app uses ES modules and a search worker, so serve it over HTTP rather than opening an HTML file directly. Assets use relative paths to support GitHub Pages project URLs.

## Project layout

- `web/`: frontend and shipped catalog.
- `lib/`: manufacturer parsing and catalog validation at build time.
- `scripts/`: static build, catalog refresh and live preview assembly.
- `tests/` and root `test-*.mjs`: geometry, catalog, DOM, theme and deployment checks.
- `docs/screenshots/`: screenshots of the actual app used in the README.

The build writes `dist/`, which is ignored by Git. No application server or database is required.

## Manufacturer catalog

```sh
npm run catalog:update
npm run build
```

The updater checks complete manufacturer lists and explicit track quantities. Ambiguous or unsupported contents keep their previous records and appear in the report. A successful update writes `data/catalog.json` atomically. The browser's update button loads this published snapshot; it does not scrape the manufacturer directly.

## Deployment and previews

Use **GitHub Actions** as the repository's Pages source. The Pages workflow tests and publishes the default branch on pushes, daily and on manual runs. Catalog refresh failure falls back to a cached snapshot or the shipped baseline.

Same-repository PRs run **Build PR preview**. Once it succeeds, the default-branch Pages workflow publishes the static artifact at `/gleiswerk/previews/pr-N/` alongside production. The Actions summaries contain the links. Previews use separate inventory keys; closed PRs are removed on the next deployment. Preview artifacts are retained for 14 days.

## Documentation and commits

Use Conventional Commits for commits and merge messages. Keep `README.md` focused on the app's purpose, features, usage and screenshots. Put development instructions here, and describe individual changes in pull requests rather than appending them to the README.
