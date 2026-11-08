# Gleiswerk

A German single-page app for planning Märklin Start up / C-track layouts from your own track inventory. It runs entirely as a static website, including on **GitHub Pages**, with no account, application server or database.

## Develop and test

Requires Node.js 24 or newer.

```sh
npm ci
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. ES modules and the search worker require HTTP rather than opening `index.html` directly. All application URLs are relative, so a project URL such as `https://pheelee.github.io/gleiswerk/` works without changing the source.

`web/` contains the frontend. `lib/` contains the build-time manufacturer parser. `scripts/build.mjs` copies frontend files and a catalog snapshot to `dist/`; build output is ignored by Git.

## Deploy to GitHub Pages

In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The `Deploy GitHub Pages` workflow builds, tests and deploys the default branch. It runs on pushes to `main` or `feature/catalog-refresh` when that branch is the default, daily at 03:17 UTC, and manually from **Actions → Deploy GitHub Pages → Run workflow**. If you choose a different default branch, add its name to the workflow's push filter.

The deployment job uses GitHub's standard Pages artifact and short-lived deployment identity. No third-party hosting configuration or secrets are needed. The default branch must be allowed to deploy to the `github-pages` environment.

For this repository the Pages address is https://pheelee.github.io/gleiswerk/.

## Catalog updates

GitHub Pages cannot run a server-side API, and the manufacturer's website does not allow direct browser requests. The workflow therefore checks the manufacturer catalog **before deployment**. The app's **„Jetzt aktualisieren“** button downloads the latest published `catalog.json`; it does not start a new manufacturer scrape. A link beside the controls opens the workflow so repository maintainers can run an immediate check without placing GitHub credentials in the browser.

To check the manufacturer locally:

```sh
npm run catalog:update
npm run build
```

The updater discovers starter sets, theme extensions and C-track extension sets, includes archived products, and validates pagination and explicit component quantities. Unknown component types or ambiguous descriptions are reported for review. Previously checked manual-only records retain their original verification date when their description and manual links are unchanged.

A successful check writes `data/catalog.json` atomically. GitHub Actions caches this snapshot for future checks, preserving newly discovered entries and their evidence. If a check fails, the previous cached snapshot is published; if no cache exists, the shipped baseline is used. Cache entries may eventually expire. Partial product failures preserve the affected entries and appear in the report. Dates in the app show the actual source check, not simply the button-click time.

The browser validates the published snapshot before saving it under `gleiswerk.catalog.v1`, separately from track inventory, favorites and custom templates. One previous catalog snapshot is available for undo. New set contents affect future additions only. A failed download, cancellation, malformed snapshot or storage error leaves the active catalog unchanged; an older published entry cannot overwrite a newer local entry.

## Inventory and privacy

New visitors start with an empty inventory. Inventory, favorites and custom set templates live only in browser local storage. **Storage is specific to the website's origin:** to move from another host or device, export your inventory as JSON on the old site and import it on the new site. Catalog changes do not alter saved inventory.

Search accepts set names, article numbers and leading zeros. Quantities over 200 pieces per component are rejected atomically. Own templates are clearly distinguished from manufacturer entries. Start up `20xxx` track numbers are pooled with geometrically equivalent `24xxx` numbers; colors do not change geometry. Rolling stock, buildings, loading ramps, pillars and heights are outside the two-dimensional model.

## Shipped catalog

The baseline was checked on 2026-11-08 and includes all 33 H0 starter sets in the manufacturer's Start up listing, including retired entries, plus seven theme extensions, C1–C5 and the white 20124 extension: **46 entries**. Each has its own track quantities, source URL and verification date. Manuals supply the explicit bills for 29133, 29199, 29641 and 29730 when their online descriptions omit them. This is not a claim to every unlisted international special edition.

## Search scope

- Fourteen supported track component types, including the 188.3 mm base station.
- R1/R2 circles, ovals and rounded rectangles, with bounded straight combinations and deduplicated symmetry.
- Loading sidings, straight and curved passing stations, reconstructed C4/C5 manufacturer plans, independent concentric ovals and straight shuttle lines. C4 supports both original open-ended branches and buffer-terminated variants.
- A finite search, rather than an exhaustive arbitrary-network solver. Mixed-radius freeform networks, custom branching, inclines and bridges are outside scope.
- Up to 64 pieces by default, 240 results and 4,500 candidates. Addition suggestions show at most 16 missing pieces.
- Nominal joins and tangents are checked with 0.35 mm position tolerance, plus sampled 40 mm roadbed clearance. This is a plausibility check, not a manufacturer CAD or rolling-stock clearance guarantee. Rounded catalog angles cause about 0.15 mm closure remainder at the straight passing station.
- Curved turnouts use the R1/77.5 mm offset construction. The double slip uses its four ports and straight crossing axes; internal switching paths are not separately measured. At most one base station is allowed in each connected layout.

## Verification and sources

`npm test` checks geometry, all baseline sets, manufacturer parsing and pagination, catalog refresh and rollback, failures and cancellations, DOM interactions, legacy inventory preservation, exports and static assets at a project subpath. Manufacturer test excerpts are included under `tests/fixtures/`; no network is needed for tests. DOM checks do not replace visual browser testing.

Each set links to its manufacturer evidence in the app. C4/C5 plans are reconstructed from the Märklin booklet at https://www.jrline.sk/Images/64/MA24905.pdf (PDF page 37 / printed page 12), using pooled starter-set inventory. Gleiswerk is an independent tool, not an official Märklin product.
