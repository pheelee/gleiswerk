# Gleiswerk

German single-page app for a Märklin C track inventory and a bounded, geometry-checked layout search. Buildless ES modules: `dist/index.html`, `app.mjs`, `engine.mjs`, and a module worker. No server, account integration, database or AI-generated track geometry. Inventory and favorites are stored locally in the visitor's browser.

## Run

Serve `dist/` over HTTP; module workers do not run from file://. In the managed environment, use the approved Sites preview only when its browser tool is available. The hosting manifest deploys `dist/` directly.

## Search contract

- Catalog: fourteen explicitly supported component types, including the 188.3 mm base station.
- Finite variation of R1/R2 circles, ovals and rounded rectangles, up to four straight pieces per long side and two per short side. Symmetric straight permutations are deduplicated.
- Loading sidings, straight and curved passing stations, numerically reconstructed C4/C5 manufacturer-derived layouts, independent concentric ovals, and open or buffer-terminated straight shuttle lines.
- Not an exhaustive arbitrary graph solver. Mixed-radius freeform networks, custom branching, inclines and bridges are outside scope. UI states the families and caps explicitly.
- At most 64 pieces (user adjustable), 240 returned layouts, 4500 candidate cap. Additions show at most 16 missing pieces.
- Quantities, nominal port alignment/tangents (0.35 mm positional tolerance), and nonadjacent 40 mm roadbed clearance are checked before returning a layout. Directly connected pieces share their approach zone. Collision sampling is about 7 mm; it is a plausibility check, not a manufacturer CAD guarantee or a rolling-stock swept-volume check. Nominal 24.3° catalog rounding causes about 0.15 mm closure remainder at the straight passing station.
- Curved turnouts use R1 curves and the actual 77.5 mm offset construction, not two concentric R1/R2 arcs. The double slip is modeled by its four ports and straight crossing axes; internal switching paths are not separately measured.
- At most one base station per connected layout. Two disconnected ovals may each use one. Electrical wiring and rolling-stock clearance require a physical check.

## Checks

`node test-engine.mjs` checks known layouts, invalid joins and overlaps, inventory matching, additions, empty inventory and terminal lines.

`node test-ui.mjs` is a DOM integration test using LinkeDOM from the execution workspace. It exercises inventory presets, filters, empty state, favorites, parts, modal, additions, persistence and exports. It does not claim visual browser QA.

Sources and detailed scope are available in the app. C4/C5 are reconstructed from the Märklin booklet at https://www.jrline.sk/Images/64/MA24905.pdf (PDF page 37 / printed page 12), and adjusted to use the pooled starter-set inventory.
