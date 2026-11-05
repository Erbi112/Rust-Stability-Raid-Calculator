# GHOSTFRAME · Rust Stability & Raid Intelligence

Interaktives Rust-Base-Analysewerkzeug: geometrisches Bauen, Stabilitäts-Hypothesen, Blueprint-Matching und Raid-Wege.

**Aktueller Status:** M0 begonnen. Ein eigenständiger v0.2-Demo-Editor mit funktionierendem Edge-Snapping liegt unter `legacy/GHOSTFRAME_Editor_v0.2.html`. Diese Demo enthält noch keine validierten Rust-Stabilitäts-/Raid-Werte. Die neue, modulare Kern-Engine liegt unter `src/core/`.

## Entwicklungsplan

Siehe [ROADMAP.md](ROADMAP.md) und [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

## Tests – ohne zusätzliche Abhängigkeiten

Mit Node.js 22.16+:

```sh
npm run test:core
```

## Als nächstes

Migration der bestehenden v0.2-Oberfläche zu React/Vite, ohne die erfolgreich bestätigte Snap-Bedienung zu verändern (M1). Erst danach Rust-Socket-, Traglast- und Stabilitätsregeln integrieren.