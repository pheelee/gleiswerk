# Gleiswerk

German single-page app for a Märklin Start up / C track inventory and a bounded, geometry-checked layout search. Buildless ES modules: `dist/index.html`, `app.mjs`, `engine.mjs`, `sets.mjs`, `catalog-ui.mjs`, and a module worker. No server, account integration, database or AI-generated track geometry. Inventory, favorites and custom set templates are stored locally in the visitor's browser.

## Set catalog, verified 2026-11-08

`dist/sets.mjs` records all 33 H0 starter sets in the official product database under the Start up feature, including retired references. The four result pages were reconciled against the entry list. Seven theme extensions, C1–C5, and the white 20124 extension bring the catalog to 46 entries. Each entry has its own factual bill of track components, source URL, optional manual URL and date. No inventory is inferred just from the product name: 29652 and 29653 have different quantities, 29166/29167 have a right turnout without a separate countercurve, and the 29952 loading ramp is not counted as a buffer stop. Manuals supply the explicit bills for 29133, 29199, 29641 and 29730 when the online description omits them.

This is a dated catalog snapshot, not automatic monitoring or a claim to every unlisted international special edition. Visitors can create their own local templates. Search accepts names, article numbers, and dealer-style leading zeros. Set quantity applies atomically; additions over 200 pieces per component are rejected without altering the inventory. Own templates are explicitly distinguished from manufacturer-derived entries.

New visitors start with an empty inventory. Existing `gleiswerk.inventory.v1` records are preserved. The optional demonstration loads the generic 29133 starter plus C2, not the original user's two packs. Start up 20xxx track numbers are canonicalized to geometrically equivalent 24xxx numbers; colored/transparent C track is pooled by geometry. Europa-Park height, pillars and rolling stock are outside the 2D track model.

## Run

Serve `dist/` over HTTP; module workers do not run from file://. In the managed environment, use the approved Sites preview only when its browser tool is available. The hosting manifest deploys `dist/` directly.

## Search contract

- Catalog: fourteen explicitly supported component types, including the 188.3 mm base station.
- Finite variation of R1/R2 circles, ovals and rounded rectangles, up to four straight pieces per long side and two per short side. Symmetric straight permutations are deduplicated.
- Single left/right loading sidings with or without a countercurve, straight and curved passing stations, numerically reconstructed C4/C5 manufacturer-derived layouts, independent concentric ovals, and open or buffer-terminated straight shuttle lines. C4 includes the original two open-ended branches as well as a variant with buffer stops, so a 29133+C4 inventory does not spuriously require two extra buffers.
- Not an exhaustive arbitrary graph solver. Mixed-radius freeform networks, custom branching, inclines and bridges are outside scope. UI states the families and caps explicitly.
- At most 64 pieces (user adjustable), 240 returned layouts, 4500 candidate cap. Additions show at most 16 missing pieces.
- Quantities, nominal port alignment/tangents (0.35 mm positional tolerance), and nonadjacent 40 mm roadbed clearance are checked before returning a layout. Directly connected pieces share their approach zone. Collision sampling is about 7 mm; it is a plausibility check, not a manufacturer CAD guarantee or a rolling-stock swept-volume check. Nominal 24.3° catalog rounding causes about 0.15 mm closure remainder at the straight passing station.
- Curved turnouts use R1 curves and the actual 77.5 mm offset construction, not two concentric R1/R2 arcs. The double slip is modeled by its four ports and straight crossing axes; internal switching paths are not separately measured.
- At most one base station per connected layout. Two disconnected ovals may each use one. Electrical wiring and rolling-stock clearance require a physical check.

## Checks

`node test-engine.mjs` checks known layouts, invalid joins and overlaps, inventory matching, additions, empty inventory, aliases and quantity limits. `node test-catalog.mjs` checks every reference against the manufacturer's list, verifies selected source-based quantities, and searches each distinct inventory represented by all 33 starter sets.

`node test-ui.mjs` is a DOM integration test using LinkeDOM from the execution workspace. It exercises empty first visit, catalog search, leading zeros, archive filters, multi-set quantities, custom templates, parts, favorites, imports with aliases and SVG/JSON exports. `node test-ui.mjs --legacy` checks preservation of an existing v1 inventory. These do not claim visual browser QA.

Sources and detailed scope are available in the app. C4/C5 are reconstructed from the Märklin booklet at https://www.jrline.sk/Images/64/MA24905.pdf (PDF page 37 / printed page 12), and adjusted to use the pooled starter-set inventory.
