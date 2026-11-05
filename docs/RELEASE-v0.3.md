# GHOSTFRAME Release v0.3 — big development block

Date: 2026-11-05

## Implemented together

1. Production source layout with Vite, React 19.2, TypeScript, React Konva, Zustand + Immer.
2. Independent polygon kernel carried over from the accepted v0.2 behavior.
3. Editor-domain operations: root / edge-attach / wall / doorframe / window / erase.
4. Multi-level support with optional lower-floor overlay.
5. Materials and editable stability values (no fake simulation output).
6. History (75 snapshots), keyboard shortcuts, camera movement, zoom, editable name.
7. IndexedDB local autosave, JSON import/export, schema and strict geometric validations.
8. Shared example compound and explanatory UI with explicit distinction between operational/geometric features and planned analytical engines.
9. Expanded test suite: geometry, domain, import validation and chain stress checks.
10. GitHub Actions for tests, TypeScript checking and release build.

## Explicit scope limitations

- React dependencies could not be downloaded in the development container due to network/DNS restrictions. The browser bundle and actual UI interactions have **not been verified in a running Vite build** here; GitHub CI is the intended verification point.
- Domain tests have been executed with Node.js; results are in `TEST_RESULTS.txt`.
- No Rust mechanics are represented as fully verified. Material labels are categories; stability input is a measurement, not an inverse physical solution.
- No external base database, permissions, raid rates or matching calibration is claimed.

## Next integrated block

M2+M3: Rust building-rule validation, richer piece types, support graph and stability simulation calibrated against controlled in-game examples; separate data sources continue to be cataloged in parallel.
