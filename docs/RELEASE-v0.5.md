# GHOSTFRAME v0.5 — Building Catalog & 2D/3D Visualization

## Scope

- Full industrial/wasteland redesign with original graphical motifs inspired by the general genre, not Rust's copyrighted interface assets.
- Functional categorized catalog (foundations, floors, walls, roofs, stairs, door inserts); root triangle/square, direct edge clicks, catalog-selected building placement.
- 2D / 3D / split switches. Three.js renders every stored floor and individual foundation elevations from the exact polygon model. Orbit, zoom, optional exploded floors, selected-level filter and hypothetical exterior hull.
- Right sidebar: manual raid-cost reference calculator for selected elements; captured measured stability and structure statistics.
- Blueprint import/export and existing IndexedDB autosave preserved.

## Cautions

- Imported / saved previous 1.0.0 blueprint format is unchanged.
- 3D only renders explicit walls and an optional unverified hull overlay. It does not synthesize real hidden geometry.
- Doors, roofs and stairs are schematic 3D approximations and aren't validated against in-game Rust sockets.
- Manual route estimates assume full-health standard components and an additive, non-splash path. Current Rust patch validation is outstanding.
- Some web sources disagree on quantities for armored doors; reference values are explicitly marked as approximate.

## Verification

- Local domain suite: 34 tests passing (geometry, height, bunker state, catalog, basic reference cost calculators).
- Production TypeScript / Vite build and GitHub Pages deployment must be verified in GitHub Actions for this release commit.
