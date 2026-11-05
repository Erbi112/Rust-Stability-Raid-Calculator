# GHOSTFRAME · Rust Stability & Raid Intelligence
## Technischer Fahrplan, Version 1.0 — 5. November 2026

**Repository:** https://github.com/Erbi112/Rust-Stability-Raid-Calculator
**Status zu Projektbeginn:** v0.2 Browser-Demo des kantenbasierten Editors; noch keine echte Rust-Stabilitäts-, Blueprint-Matching- oder Raid-Engine.
**Leitprinzip:** Erst genaue Geometrie und verifizierte Rust-Regeln, dann sichere Aussagen. Kein erfundener Prozentwert, keine nicht erlaubten Datenübernahmen.

### Zielbild

Ein browserbasiertes, lokal nutzbares und perspektivisch servergestütztes Tool zum Nachzeichnen von Rust-Basen (Quadrate, Dreiecke, Wände, Türrahmen, Geschosse), Erfassen von sichtbaren Bauteilen und Stabilitätsmessungen, Vergleichen mit strukturierten, legitim beschafften Bauplänen und Berechnen sinnvoller Raid-Routen je Kandidat sowie unter Unsicherheit.

### Festgelegter Technologie-Stack

| Schicht | Technik | Grund |
|---|---|---|
| Sprache | TypeScript (strict) | Zuverlässige Geometrie-, Beobachtungs- und Analysemodelle |
| Web-App | React + Vite | Komponenten, guter lokaler Entwicklungsserver, statisches Deployment |
| Canvas 2D | react-konva / Konva | Interaktive Polygone, Layer, Pointer-/Touch-Bedienung |
| UI | CSS Design Tokens, eigene Komponenten | Futuristisches Design ohne unnötige Abhängigkeit |
| State | Zustand + Immer (nach Migration) | Präzise Editor-Aktionen, Undo/Redo, selektive UI-Updates |
| Datenprüfung | Zod + JSON Schema | Versionierte, überprüfbare Import-/Export-Daten |
| Offline | IndexedDB (Dexie, später) | Autosave, lokale Projekte ohne Login |
| Geometrie | Eigene reine TypeScript-Engine | Exakte, rendererunabhängige Polygon-Sockets, Toleranzen, Kollision |
| Stabilität | Deterministischer, versionierter Regel-Simulator | Reproduzierbare, gegen Ingame-Tests prüfbare Werte |
| Blueprint-Matching | Graphsignaturen, Rotations-/Spiegelungsnormalisierung, Constraint Filtering | Erst plausible Struktur-Kandidaten, dann feinere Bewertung |
| Wahrscheinlichkeit | Kalibrierte statistische Modelle, zunächst nur Scores | Keine mathematisch unbelegten Prozentangaben |
| Raid-Planung | Graphalgorithmen (Dijkstra/A*) + Ressourcenoptimierung | Billigste Route je Hypothese; später risikogewichtet |
| Rechenjobs | Web Worker | UI bei komplexen Simulationen responsiv halten |
| 3D (optional später) | Three.js + React Three Fiber | Visualisierung/Stockwerksansicht; nicht Voraussetzung für den Kern |
| Backend (erst wenn nötig) | FastAPI oder Node/TypeScript API, PostgreSQL | Größere Kataloge und freigegebene Imports; Entscheidung bei M5 |
| Tests | Node-Test für Kern-Bibliothek, danach Vitest + Playwright | Geometrie-, Regel-, Import- und UI-Regressionen |
| CI | GitHub Actions | Automatische Tests bei jedem Push/PR |

**Nicht einführen, bevor erforderlich:** Microservices, KI-Bildmodell als Wahrheitsquelle, Cloud-Zwang, PostGIS und Vektor-Suche. KI darf später bei der Erfassung von Screenshots helfen, die Geometrie muss verifiziert werden.

### Meilensteine in verbindlicher Reihenfolge

| Nr. | Ziel / Release | Lieferung | Abnahmekriterium | Status |
|---|---|---|---|---|
| M0 | Fundament / v0.3a | Repository-Struktur, Roadmap, Geometrie-Modul, Testfälle, Modell v1, CI | Dokumentiertes Schema + bestandene Tests | **gestartet** |
| M1 | Editor / v0.3 | v0.2-UI in React, echte Polygon-Sockets, Wand-/Türkanten, Rotation, Undo, Speicherung, Export | Dreieck↔Quadrat ohne Versatz, keine Überlappung, wiederholbarer Export | offen |
| M2 | Rust-Baulogik / v0.4 | Geschosse, Wandvarianten, Fenster, Türen, Fundamente, Roof, Halfwall, Höhen, Kollisions-/Socket-Regeln | 20+ Ingame-Referenztests bestanden | offen |
| M3 | Stability Engine / v0.5 | Support-Graph, Träger/Anker, Stabilitätswerte, Einsturz nach Zerstörung | Vergleich mit expliziten Ingame-Messungen, Fehlerbericht | offen |
| M4 | Datenpipeline / v0.6 | Blueprint-Schema, Provenienz-/Lizenzprüfung, Importer, Editor-Annotation, Versionierung | 30+ rechtmäßig nutzbare, manuell geprüfte Referenzbasen | offen |
| M5 | Base Matching / v0.7 | Kandidatenfindung aus Silhouette/Kanten/Stockwerken/Stabilität; Rotationen/Spiegelungen; Top-N-Erklärung | Testset mit bekannten Basen; gemessene Top-k-Trefferquote | offen |
| M6 | Raid Engine / v0.8 | Material-HP, Tool-Kosten, gemischte Sprengmittel, Wege, Zielräume | Kosten mit versionsbezogenem Rust-Datensatz abgeglichen | offen |
| M7 | Risiko-Routen / v0.9 | Optimale Route pro Kandidat, erwartete Kosten, Worst Case, Informationsgewinn nach Breach | Korrekte Benchmark-Fälle über mehrere Hypothesen | offen |
| M8 | Produktreife / v1.0 | 3D-Ansicht, UX, Performance, Basisbibliothek skalieren, Release, Updateprozess | 1.000+ Referenzbasen *nur* sofern Rechte/Qualität vorliegen; reproduzierbare Releases | offen |

**Parallel-Schiene Daten ab M1:** Quellenregister und Creator-Erlaubnisse pflegen; Daten nicht ungeprüft scrapen. Qualität L0 = Link/Bild, L1 = Silhouette, L2 = Grundriss, L3 = Geschosse, Wände, Türen, L4 = Ingame-validierter Struktur-/Stabilitätsdatensatz. Nur L3/L4 fließen in strukturelles Matching ein. Weder 500 noch 2.000 Datensätze rechtfertigen erfundene Geometrie.

### Modell-/Rechenregeln

- Jede Bauteil-Geometrie wird in **Weltkoordinaten** gespeichert, niemals in Bildschirmkoordinaten.
- Jede Fläche besitzt Polygon, Typ, Geschoss, Grade, mögliche Anbausockets; Kanten verbinden strukturelle Elemente.
- Messergebnisse haben Wert, Herkunft, Zeitpunkt und Unsicherheit. `unknown` ist ausdrücklich nicht 0%.
- Unterschiedliche bekannte/unsichtbare/hypothetische Bauteile bleiben unterscheidbar.
- Für eine beobachtete Base existiert eine Menge von Hypothesen; ein Matching-Score ist **keine** kalibrierte Wahrscheinlichkeit.
- Der Raid-Rechner bekommt eine versionierte Tabelle mit Quelle und Patchdatum. Keine statischen Preis-/Damage-Zahlen ohne Versionsbezug.
- Route für Kandidat A/B/C und gemeinsame robuste Route sind zwei verschiedene Ausgaben.
- Stabilität und Raid-Ergebnisse sind Heuristiken, bis sie mit der realen Rust-Version überprüft wurden.

### M0 – konkrete Task-Reihenfolge

1. Bestätigte v0.2-Demo unverändert im Ordner `legacy/` sichern.
2. Versioniertes `Blueprint`-Modell mit zählbaren Koordinaten, festen IDs, `observation` und `source` etablieren.
3. Geometrie als reine Bibliothek: quadratisch, gleichseitig dreieckig, kantenbasiertes Andocken, Innenraum-Kollision, belegte Kanten.
4. Mindestens sechs deterministische Tests, darunter Quadrat-an-Dreieck, Dreieck-an-Quadrat, Doppelbelegung und Berührung ohne Überlappung.
5. CI-Testlauf und README. Danach React-Migration in M1.

### M1 – konkrete Task-Reihenfolge

1. Vite/React/TypeScript-Projektgerüst; die v0.2-Optik als UI-Ziel beibehalten.
2. Canvas: Zoom/Pan, Selektion, echte polygonale Snap-Vorschauen, freie Kanten markieren.
3. Tools: Quadrat, Dreieck, Wand, Türrahmen; Material, Status und Stabilitätsmessung.
4. Ebenen/Undo/Redo; Validierung des Modells; lokales Autosave und JSON-Import/-Export.
5. Browser-/E2E-Tests + UX-Review; erst danach M2.

### Rust-Version / Datenpflege

- Heute (05.11.2026) ist der nächste Monats-Patch angekündigt; zum Zeitpunkt der Recherche waren auf der offiziellen Facepunch-News-Seite die Oktober-News die letzten veröffentlichten Monatsnotizen. Vor der Arbeit an M2/M3/M6 Patchstand erneut prüfen.
- Für jede neue Rust-Version Testfälle gegen Ingame-Referenzbases durchlaufen; Regeln und Raid-Tabelle separat versionieren; Abweichungen im UI anzeigen.
- Externe Kataloge nur mit geklärten Nutzungsrechten oder ausdrücklicher Freigabe ingestieren. Ohne Recht auf Übernahme bleiben Links reine Recherchehinweise.

### Definition of Done je Meilenstein

Funktion implementiert, Tests grün, wichtige Fälle dokumentiert, keine als real ausgegebenen Demo-Werte, JSON kompatibel/migrierbar, README aktualisiert, keine Regression des etablierten Edge-Snapping-Verhaltens. Keine Phase wird als fertig markiert, solange Kernfunktionen noch Platzhalter sind.

---

### Umsetzung nach Entwicklungspaketen (vereinbart 2026-11-05)

Die Arbeit erfolgt in **größeren integrierten Release-Blöcken**. Pro Block werden zusammengehörige Funktionen fertig implementiert, als Paket durchgetestet und gemeinsam ausgerollt. Zwischenstände dienen nur internen Sicherungen, nicht als separate Kleinst-Releases.

**Block A · Editor v0.3 (gestartet 2026-11-05):** React/Vite-Shell, kantenbasierte Geometrie, Material- und Stabilitätseingabe, Wände/Türrahmen/Fenster, Geschosse, Undo/Redo, IndexedDB-Autosave, validierter JSON-Import und -Export, durchgehende Tests. Teststand: 21/21 Node-Kerntests bestanden. Vollständiger React-Browserbuild auf GitHub CI zu verifizieren (lokales Netzwerk blockiert npm-Installation).

**Block B · Bauregeln und Stability Engine (nächster großer Block):** Rust-Regeltests zu Kollisionen, Höhenversätzen, Wänden, Stützen, tatsächlichem Support-Graph und Stabilitätszerfall, kalibrierte Simulationen gegen kontrollierte Ingame-Testbasen, Einstieg in die 3D-Berechnung.

**Block C · Blueprint Library und Matching:** Strukturierte, rechtlich freigegebene Katalogeinträge, Importer, Deduplizierung, Mustererkennung unter Rotation/Spiegelung, Ausschluss inkonsistenter Kandidaten, nachvollziehbare Konfidenz statt frei erfundener Wahrscheinlichkeiten.

**Block D · Raid Intelligence und Veröffentlichung:** Versionierte Schadens-/Kostenwerte, Raid-Graphoptimierung, Routenvergleich pro Kandidat und unter Unsicherheit, Tests und Release.
