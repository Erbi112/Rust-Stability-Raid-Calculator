# Architekturentscheidungen (ADR v1)

## Fachliche Trennung

- **Domain/Core:** Polygone, Kanten, Kollisionen, geometrische Snap-Regeln. Keine Browser- oder React-Abhängigkeiten.
- **Blueprint:** Versioniertes JSON mit `pieces`, `edges`, `observations`, `source`, Spielregelstand und Herkunft/Erlaubnis.
- **Rules:** Rust-spezifische Socket-Einschränkungen, Höhen, Stützen, Stabilität, Einsturz und Raid-Kosten (erst nach Ingame-Verifikation).
- **Matching:** Kandidaten aus normalisierten Signaturen plus Constraint-Verifikation; keine erfundenen Posterior-Werte.
- **UI:** Canvas-Editor, 2D/3D-Ansichten, Inspektor, Kandidaten und Raid-Routen.
- **Data:** L0–L4 Katalog; nachvollziehbare Quelle und rechtliche Freigabe je Datensatz.

## Schichtgrenzen

`UI → Editor State → Domain/Core → Rule Engine → Matching/Raid Engine`.
Data Imports passieren via Schema-Prüfung; Rechenjobs später in Worker ausführen. Eine UI-Demo darf keine `true`-Wahrscheinlichkeiten oder Raid-Kosten als echt anzeigen.

## M0 Geometrie-Prinzip

Polygone nutzen die mathematische Weltachse (x horizontal, y nach unten). Eckpunkte sind im Uhrzeigersinn bei y-down angeordnet. Eine Anbaufläche ist **die vollständig gemeinsame Polygonkante**; ein Quadrat an einer Dreieckskante wird automatisch passend gedreht. Flächenberührung ist zulässig, Flächenüberschneidung nicht. Der geometrische Kern bleibt von Rust-spezifischen Spielregeln getrennt.

Die Seitenlänge ist im Kern zunächst eine normierte Baueinheit. Eine exakte Meterkalibrierung ist Gegenstand späterer Ingame-Tests.