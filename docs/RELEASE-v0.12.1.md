# GHOSTFRAME v0.12.1 · Raid-Summen für offene Rahmen

- Fehler behoben: Der automatische Routen-Graph wertete leere Türöffnungen und Wandrahmen schon mit 0, die manuelle Raid-Kalkulation hingegen als unbekannte Kosten.
- Türöffnung oder Wandrahmen ohne modellierten Einbau: 0 Sprengmittel für den Durchgang. Eingebaute Türen und Garagentore kosten weiterhin die hinterlegten Referenzwerte.
- Screenshot-Beispiel: freier Wandrahmen + Steinwand + freie Türöffnung = 4 Rockets und 5.600 Schwefel (Voll-HP-Community-Referenz).
- Keine pauschale Schätzung bei tatsächlich unbekannten Hindernissen. Das irreführende "4+" wird durch einen eindeutigen unberechenbaren Status und eine separate Teilsumme ersetzt.
- Gemischter Raid-Plan meldet bei unbekannten Zielen keine scheinbar vollständige Gesamtsumme.
- Versionsanzeige an das Paket angepasst. Regressionstests für freie Öffnungen, Garagentore und unbekannte Fenster.
- Keine Garantie für versteckte oder nicht eingetragene Einbauten, Splash Damage, Soft-Side- oder Einsturz-Effekte.
