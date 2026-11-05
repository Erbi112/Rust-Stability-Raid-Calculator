# GHOSTFRAME v0.8.0 · Blueprint Intelligence

## Release block
- Construction sidebar: vertical scrolling only, no unintended horizontal scrollbar.
- Blueprint library: local multi-document IndexedDB collection, JSON import/export, save/load/delete.
- Search & filters: solo, duo, trio, squad, clan (including multi-team eligibility); base role; bunker type; biome; external / multi-TCs; honeycomb; roof bunker; stability bunker; wide gaps; shooting floors; traps and base features.
- Explicit tri-state classification: `yes`, `no`, `unknown`. Missing data is not a negative observation.
- 67 combinable tri-state feature filters in eight categories: TC / compound, height/stacking, bunker, PvP defense, loot/entry, location/transport, utility, expansion.
- Base metadata also records footprint, stage, defense focus, allowed group sizes, number of external TCs, bunkers, loot rooms, wall layers, known build costs, upkeep and raid cost references.
- Search: choose multiple group sizes (OR), plus any number of feature conditions (AND). Unknown is distinct from no. Source qualities L0–L4 and material, floors and numeric filters supported.
- Metadata in each BlueprintDocument, with import validation and backwards compatibility.
- Conservative library comparison: shape counts, floors, material and height transitions only. Similarity is **not** probability.
- Rust building skins: names and grade constraints from the official [store](https://rust.facepunch.com/store/), including Crypt, Jungle and Space Station. Skin selection applies to tiles and edges, persists in JSON, and affects custom procedural 2D/3D previews. Does not reuse Facepunch textures or claim to look pixel-identical.

## Not part of v0.8
- Automatic recognition of real hidden interiors from scraped bases.
- Game-exact stability physics or statistically calibrated probabilities.
- Licensed Rust textures or exact geometry for every purchasable skin.

## Data acquisition rules
Entries contain provenance and source licensing; no bulk ingestion of third-party repositories without rights or permission. Demos are authored by this project.

## Verification

- Unit tests include group-size OR plus feature AND logic, known-vs-unknown flags, numeric ranges and JSON validation.
- Continuous integration runs the Node tests, TypeScript check, Vite build and GitHub Pages deployment.
- User visual/browser acceptance is separate from a successful automated build.
