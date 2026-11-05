# GHOSTFRAME

**Rust Stability & Raid Intelligence** · Editor Release `v0.3.0`

GHOSTFRAME is an independent browser-based base blueprint editor for the survival game Rust. It is **not** affiliated with Facepunch Studios.

## Current features

- Rust-style edge snapping: square ↔ equilateral triangle at the correct orientation, including slanted triangle edges.
- Deterministic geometry core, tile overlap prevention, occupied-edge checks, transparent placement preview.
- Separate floors (level 0 = foundation), optional underfloor silhouettes.
- Wall, door frame, and window markers directly on real polygon edges.
- Material and **manually measured** stability editing (`unknown` is distinct from `0%`).
- Selection, eraser, keyboard shortcuts, pan/zoom, undo/redo, single-project IndexedDB autosave.
- Versioned JSON export/import with geometry, schema, stability and collision checks.
- A preloaded demo base and status/inspector panels.

**Not yet supported:** genuine Rust stability simulation, automatic candidate matching, raid calculations, 3D support, server database. The UI intentionally does not invent these outputs.

## Direkt im Browser ausführen (GitHub Pages)

**Web-App (nach einmaliger Aktivierung von GitHub Pages):**
https://erbi112.github.io/Rust-Stability-Raid-Calculator/

Der vorhandene Workflow `Test, Build & Publish` prüft bei jedem Push auf `main` zuerst die Tests und den TypeScript-/Vite-Build. Nur wenn diese erfolgreich sind, wird die neue Webversion veröffentlicht. Pull Requests werden geprüft, aber nicht live geschaltet.

**Einmalige Einrichtung durch den Repository-Inhaber:** Öffne [Settings → Pages](https://github.com/Erbi112/Rust-Stability-Raid-Calculator/settings/pages) und wähle unter **Build and deployment → Source** die Option **GitHub Actions**. Danach den Workflow unter **Actions → Test, Build & Publish → Run workflow** einmal ausführen, falls die Veröffentlichung nicht bereits erfolgreich war.

Die GitHub-Pages-Version ist eine rein clientseitige Anwendung: Die Daten werden lokal im Browser (IndexedDB) gespeichert, nicht im GitHub-Repository. Nutze den JSON-Export für Sicherung und Gerätewechsel. Weitere Hinweise: [Deployment-Dokumentation](docs/DEPLOYMENT.md).

## Run locally

Prerequisites: Node.js 22.16+ and npm.

```bash
npm install
npm run dev
```

Then visit the URL shown by Vite (normally `http://localhost:5173/`).

### Quality checks

```bash
npm test
npm run typecheck
npm run build
```

GitHub Actions runs the three checks automatically for pushes and pull requests. If package downloads are blocked in your environment, the dependency-free domain tests (`npm test`) will still work and the [accepted v0.2 legacy editor](legacy/GHOSTFRAME_Editor_v0.2.html) opens directly as a local HTML file.

## Layout

- `src/core/geometry.ts` — rendering-independent geometry kernel
- `src/core/editor.ts` — pure building operations (tiles, edges, snapshots, metadata)
- `src/core/blueprint.ts` — versioned structure, stability observations, metadata
- `src/services/persistence.ts` — IndexedDB and validated JSON import/export
- `src/store/useEditor.ts` — Zustand editor state with Immer, undo/redo
- `src/ui/App.tsx` — React Konva editor + modern UI
- `tests/` — deterministic geometry/blueprint validation checks
- `legacy/` — unchanged, user-approved v0.2 reference editor

## Roadmap

See [ROADMAP.md](ROADMAP.md), [architecture notes](docs/ARCHITEKTUR.md), and [release notes](docs/RELEASE-v0.3.md).

**Rules of engagement:** ship meaningful integrated blocks (implementation, tests, release), not endless individual micro-commits. No unauthorized scraping or unverified “probability” claims.
