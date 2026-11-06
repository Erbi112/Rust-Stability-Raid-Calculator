# GHOSTFRAME v0.10 — Raid Route Intelligence

**Release date:** 2026-11-06

## Scope

1. Graph of documented same-floor adjacent polygons, shared edges, lower-floor exterior, and congruent adjacent-floor slabs/frames.
2. Rocket/C4 sulfur optimization using full-health reference counts for known walls/doors/floors/hatches. Unknown elements are excluded from verified model paths; exploratory routes carry unknown counts and **no total**.
3. Select a target floor polygon in the Raid panel, view ranked perimeter routes, adopt selected path, highlight 2D/3D barriers.
4. Recognition-based multi-candidate planner. Each hypothetical blueprint is routed individually. Only if **all** chosen candidates have costed routes, an inverse-transformed common entry can be ranked by worst-case sulfur (minimax); no probability weighting.
5. Regression tests cover routing, model gaps, vertical floor offsets, rotation/shift alignment, cost method changes, and invalid selected targets.

## Data caveats and limits

- **Models are not game-verified**. The presence of an entry in a blueprint is not proof that it exists in a real base. The game version in the user's file may be unknown.
- **No unknown-edge free passage**: absence of an explicit wall/door is not evidence of an open door. Costed routes require documented traversals.
- **No external F1/roof entry planning**, splash damage, explosive combinations, soft side, instability-triggered collapse, trap/roof-bunker phase transitions or inferred hidden loot.
- Floor hatch reference is one C4 / two rockets when inserted; fully open floor frames have no hatch cost. Full floors use the existing wall-tier reference estimates as a simplified cost model.
- The recognized candidate shortlist consists only of local/demo/uploaded plans. No automatic licensed external-base ingestion in this version.

## Reference sources

- https://rust.wiki/calculators/raid
- https://beancan.gg/wiki/guides/raid-costs
- https://rust-forge.com/raid/

These sources are not a substitute for per-patch in-game checks.
