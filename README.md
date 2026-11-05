# GHOSTFRAME · Rust Base Planner, Stability & Raid Intelligence

![Version](https://img.shields.io/badge/version-v0.5.0-cb682f) ![CI](https://img.shields.io/badge/CI-tests%20%2B%20build-394c51)

[**▶ GHOSTFRAME im Browser öffnen**](https://erbi112.github.io/Rust-Stability-Raid-Calculator/)

Browser-based blueprint editor for the game **Rust**, independently designed and not affiliated with Facepunch Studios. Original vector illustrations and original interface assets; no copied game graphics.

## Release v0.5 · Visual 2D/3D Studio

- Fully **clickable grouped building catalog** (26 construction pieces and door inserts) with custom original icons. Each selection has a functional edit/place mode; no placeholder dropdown-only catalog.
- Native **2D polygon floor planner**, **interactive 3D view**, and **split mode**. 3D uses Three.js from the *same* blueprint document. Drag to orbit, scroll to zoom, show selected floor or all floors, toggle exploded levels and optional speculative outer hull.
- Rust-inspired original industrial/wasteland UI: dark steel panels, orange accents, site navigation, new hero vector art, dense readable tool cards and a right-side analysis panel.
- Foundation elevation independently stored in wall-height units (e.g. +0.5 H); 3D displays these height differences and stacked floors.
- Direct click on an existing edge opens its context menu for material, structure type, health, soft side and insert. Select a catalog wall/door first and click a polygon edge to place it directly.
- Triangle or square as the **first** foundation. Selection, zoom/pan, undo/redo, floor switch, JSON import/export, and browser IndexedDB autosave remain available.
- Right-side manual **raid target list** with selectable Rockets/C4 counts and sulfur for *explicitly selected targets* using named public reference data. Not an optimal-path algorithm. Missing/unsupported categories produce no invented number.
- Stability dashboard shows only measurements actually entered. No fake physics or invented probability figures.
- 34 deterministic Node tests for geometry, catalog, heights, persisted blueprint formats, and manual raid costs.

### Current limitations (must not be presented as verified game mechanics)

1. **3D is a visualization**, not a Rust-valid building physics solver. Stairs, roof forms, and some door frame types have **schematic** geometry; some socket and height placements are not validated against the current game patch.
2. The optional 3D **Hülle** toggle renders guessed outer-wall previews; this is **never** saved as factual building evidence.
3. **Raid prices** use public reference tables for intact standard targets and simple additive manual paths, no partial-health damage simulation, splash damage, building collapse or automatic search for the cheapest route.
4. Rust's exact stability, current patch variations, blueprint matching database, collaborative server storage, and automated raid optimization follow in larger future releases.

### Raid reference sources

- [Facepunch Rust Rocket reference](https://wiki.facepunch.com/rust/item/ammo.rocket.basic)
- [Rust Wiki raid calculator](https://rust.wiki/calculators/raid)
- [RustKit raid data](https://www.rustkit.app/raid/costs)
- [RustEdit building piece reference](https://rustedit.rusthq.com/prefabs/building-tool)

Because these sources can differ, reference counts and recipes should be patch-validated before anyone relies on exact calculations. The UI displays this distinction.

## Run locally

Node.js 22.16+ and npm required:

```bash
npm install
npm run dev
```

For production testing:

```bash
npm test
npm run typecheck
npm run build
npm run preview
```

## Deployment

GitHub Pages is configured to deploy from **GitHub Actions**. Every push to `main` runs tests, TypeScript checks, a Vite build and publishes `dist/` on success. The app is stored only in the browser (IndexedDB) and JSON exports, not remotely on GitHub.

## Code layout

- `src/core/geometry.ts` — geometric constraint kernel
- `src/core/editor.ts` — pure building operations and edge placement
- `src/core/blueprint.ts` — versioned blueprint, elevations and bunker states
- `src/core/catalog.ts` — typed functional construction catalog
- `src/core/raid.ts` — *manual route reference* cost calculations
- `src/store/useEditor.ts` — state/history/import actions
- `src/ui/App.tsx` — 2D studio, building catalog, navigation
- `src/ui/ThreeBaseView.tsx` — orbitable multi-level 3D reconstruction
- `src/ui/StructureIcon.tsx` — original catalog vector icons
- `src/ui/AnalysisPanel.tsx` — direct sidebar calculations and status
- `public/wasteland-header.svg` — original industrial hero vector landscape
- `tests/` — geometry, state, catalog and cost regression tests
- `legacy/` — preserved earlier user-approved prototype

See [ROADMAP.md](ROADMAP.md) and [v0.5 release notes](docs/RELEASE-v0.5.md).

**Development principle:** one complete integrated functional release block, then comprehensive regression test / CI deployment, then the next large block.

## v0.6.1

2D-Bauplan wird am tatsächlichen Grundriss zentriert; 3D-Grundflächen und Wände sind X/Z-identisch und berücksichtigen die Höhen. Eigenständige rustindustrielle Gestaltung. Stabilitäts-/Raidberechnung noch nicht vollständig validiert.

## Multi-floor building (v0.6.2)

F1 starts one full wall-height above F0, including any local foundation offset. On F1+, choose **Untergeschoss als Decke übernehmen** to copy the previous floor footprint into true floor plates with correct elevations. Previously saved plans with F1 at 0 H show an explicit **ältere Etagenhöhen korrigieren** action; this action is undoable. See [release notes](docs/RELEASE-v0.6.2.md).

## v0.6.3 – Leiterklappe und Garagentor

Im Baukatalog sind Leiterklappen für quadratische und dreieckige Bodenrahmen sowie das Garagentor für Wandrahmen auswählbar. 2D/3D und JSON-Persistenz bilden Einbauten separat vom Tragwerk ab. [Release-Details](docs/RELEASE-v0.6.3.md).
