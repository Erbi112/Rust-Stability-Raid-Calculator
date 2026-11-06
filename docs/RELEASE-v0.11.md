# GHOSTFRAME v0.11 – Raid Reference & Module Workspaces

## Release-Inhalt

- Versionierter, quellenbezogener Raid-Referenzdatensatz (Rust-Community, Stand 3. September 2026). Unterstützte Methoden: Rockets, C4, Satchels und Explosivmunition.
- Schadens- und Schwefelreferenzen mit Status je Bauteil: externe Referenz, Modellannahme oder unbekannt. Keine ungekennzeichnete HP-Skalierung, keine behauptete Rust-Physiksimulation.
- Quellen- und Verifikationsstatus in der Blueprint-Bibliothek strikt getrennt von Qualität L0–L4.
- Dashboard, Blueprint Library und Settings verwenden die ganze Arbeitsfläche ohne Baukatalog und Analyse-Sidebar.
- Stability hat eine eigenständige, breite, nicht-destruktive 2D-/3D-Analyseoberfläche mit Struktur-Report.
- Raid Calculator hat eine breite Arbeitsfläche ohne Baukatalog. Klick auf Bauteile in 2D **oder 3D** öffnet ausschließlich einen Raid-spezifischen Inspector mit Kosten und Ziel-/Routenaktionen.
- Bauteil-Bearbeiten-Dialog erscheint nur im Canvas Studio; sämtliche Dialoge werden im Browser-Viewport verankert und innerhalb des sichtbaren Bereichs gescrollt.
- Baukatalog horizontal overflow-sicher; Geschoss-Tasten umbrechend statt abgeschnitten.

## Grenzen

Die Werte sind öffentliche Community-Referenzen und können sich zwischen Rust-Versionen unterscheiden. Einige öffentliche Tabellen weichen sogar bei identischen Objekten geringfügig ab (etwa Explosivmunition für Holz). Ergebnisse nicht als live verifizierte Ingame-Simulation interpretieren. Keine physikalische Splash-, Bunker-, Soft-Side- oder Einsturzkettenberechnung. Ingame-Nachweise sind manuell dokumentiert und werden nicht automatisch auf Echtheit geprüft.

## Checks

`npm test` und `npm run build` laufen in GitHub Actions; Tests prüfen Modulmodus, Popup-Positionierung, vier Raid-Munitionstypen, Datenqualität und bestehende Engine-Funktionen.
