# GHOSTFRAME v0.9 · Blueprint Recognition

## Added
- Geometric comparison of partially observed Rust bases against available Blueprint Library records.
- Rotation, translation, mirroring, floor alignment, matched polygon IDs, known elevations, explicit materials, doors, windows and bunker states.
- Side-by-side interactive floor previews; candidate details show supported observations, missing data, and contradictions.
- Search, quality and feature filters apply to the recognition candidate set.
- Batch import of up to 100 JSON blueprints, with duplicate-ID and format protection.
- 14 deterministic recognition tests in addition to the prior 78 tests.

## Design and evidence limitations
The matcher is a structural compatibility checker, not a posterior probability model. A visually matching partial base may have a completely different internal arrangement. No inferred walls, hidden TCs or loot rooms are presented as observed. Candidate records are limited to saved/imported source documents and the two original demos. A real verified database and version-calibrated Rust damage/stability calculations remain future milestones.

No third-party assets or blueprints have been copied into this release.
