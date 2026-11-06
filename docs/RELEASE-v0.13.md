# GHOSTFRAME v0.13 · Gespeicherte Raid-Varianten

## Implementiert

- Bis zu 24 benannte Raid-Szenarien pro Blueprint; die Auswahl aller Bauteil-IDs und der je Bauteil gewählte Sprengmitteltyp werden gespeichert.
- Laden / Löschen mit Undo/Redo des gespeicherten Projektdokuments, Weitergabe über den bestehenden JSON-Export sowie Speicherung über IndexedDB.
- Vergleich des bekannten Schwefelbedarfs nach aktuell dokumentierten Eigenschaften der Baukomponenten, einschließlich separat ausgewiesener freier Öffnungen.
- Nur vollständig bepreiste Varianten haben einen Kostenrang; unbekannte oder gelöschte Bauteile und nicht mehr vorhandene Zielräume verhindern eine exakte Gesamtsumme.
- Maximal 150 Ziele je Szenario; Importprüfung verhindert doppelte IDs, unbekannte Munitionsarten und ungültige Namen.
- Regressionstests für Metadaten, Rundreise durch JSON, Aktualisierung nach Änderungen und Ranking.

## Grenzen

Ein Szenario ist eine vom Nutzer markierte Reihenfolge von Hindernissen, **keine** verifizierte topologische Route. Der Kostenrang ist kein Nachweis für erreichbaren Zielraum, Splash-Schaden, Gebäudeeinsturz oder aktuell kalibrierte Rust-Physik. Alle Sprengmittelpreise stammen aus dem im Tool hinterlegten quellenbezogenen Referenzstand.
