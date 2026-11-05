# GHOSTFRAME v0.8.0 · Blueprint Intelligence

## Release block
- Construction sidebar: vertical scrolling only, no unintended horizontal scrollbar.
- Blueprint library: local multi-document IndexedDB collection, JSON import/export, save/load/delete.
- Search & filters: solo, duo, trio, squad, clan; base role; bunker type; biome; external / multi-TCs; honeycomb; roof bunker; stability bunker; wide gaps; shooting floors; traps and base features.
- Explicit tri-state classification: `yes`, `no`, `unknown`. Missing data is not a negative observation.
- Metadata in each BlueprintDocument, with import validation and backwards compatibility.
- Conservative library comparison: shape counts, floors, material and height transitions only. Similarity is **not** probability.
- Rust building skins: names and grade constraints from the official [store](https://rust.facepunch.com/store/), including Crypt, Jungle and Space Station. Skin selection applies to tiles and edges, persists in JSON, and affects custom procedural 2D/3D previews. Does not reuse Facepunch textures or claim to look pixel-identical.

## Not part of v0.8
- Automatic recognition of real hidden interiors from scraped bases.
- Game-exact stability physics or statistically calibrated probabilities.
- Licensed Rust textures or exact geometry for every purchasable skin.

## Data acquisition rules
Entries contain provenance and source licensing; no bulk ingestion of third-party repositories without rights or permission. Demos are authored by this project.
