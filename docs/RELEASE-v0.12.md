# GHOSTFRAME v0.12 · Multi-Target Raid Planner

## Fehlerbehebung
Bisher setzte ein unbekanntes Ziel die komplette Raid-Gesamtsumme auf null. Jetzt werden berechenbare Ziele als transparente Teilsumme angezeigt und die Anzahl offener Ziele separat gezählt. Vollständige Gesamtkosten erscheinen nur für vollständig berechenbare Routen.

## Neue Funktionen
- Methode-spezifische Summen für Rockets, C4, Satchels und Explosivmunition
- Einzeldarstellung der Kosten je Ziel und gesonderte Kennzeichnung offener Werte
- Gemischter Raid-Plan mit manueller Sprengmittelwahl pro Ziel und aggregiertem Schwefelbedarf
- Doppelte IDs werden nicht doppelt gezählt; gelöschte Ziele bleiben als offene Positionen sichtbar
- Keine vorgetäuschte Schadenssimulation: Referenzen gelten weiterhin für intakte Einzelziele, ohne Splash oder Einsturz

## Prüfungen
Sieben neue Regressionstests für Summen, unbekannte/entfernte Ziele, ID-Deduplikation und gemischte Methoden. Vorhandene Tests bleiben erhalten.
