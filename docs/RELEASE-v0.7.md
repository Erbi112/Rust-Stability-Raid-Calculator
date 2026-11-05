# GHOSTFRAME v0.7 · Structural Intelligence (first implementation)

## Added
- Model-based **foundation-to-floor connectivity graph** for recorded building tiles and load-bearing wall/frame edges.
- Height-aware cross-floor connections requiring geometric edge overlap and height alignment. A missing support is marked *not documented*, **not** collapsed.
- Interactive 2D and 3D overlays: gold = model foundation anchor; green = plausible connection; red = unverified link.
- The Stability panel displays connected/unverified piece counts, measured Ingame stability separately, and hypothetical deletion impact for selected floor, wall, or frame. Simulation is non-destructive.
- 10 regression tests for support paths, removal dependencies, alternative load paths, foundations, measured values and half-level offsets.

## Important limitation
This release **does not** reproduce the internal Facepunch stability formula and **does not** claim to know collapse probabilities, true Rust support sockets or live-in-game performance. It only evaluates an explicit, incomplete geometric support graph. Real measurements remain distinguished from inferred topology. Ground contact, structure ownership, connection materials and dedicated server rules still require validation.

## Next large release
Calibrated, patch-tagged observations and a richer blueprint evidence pipeline (known/unknown support, multiple possible models), followed by raid-route comparison, not fictional posterior probabilities.
