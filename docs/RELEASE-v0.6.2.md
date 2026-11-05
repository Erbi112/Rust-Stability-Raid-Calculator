# GHOSTFRAME v0.6.2 – Mehrgeschoss- und Z-Fighting-Korrektur

## Ursache
Beim erstmaligen Platzieren auf F1+ verwendete der Editor standardmäßig `0 H` als absolute Oberkante. Die 3D-Szene setzte diese Platten deshalb exakt auf F0. Überlagerte Deckflächen führten zu Flackern (Z-Fighting).

## Korrektur
- Neue Platten auf F1 beginnen bei 1 H (3 m), F2 bei 2 H usw.; vorhandene angehobene Fundamente vererben ihren Höhenversatz an das nächste Geschoss.
- Die Start-Höhenwahl ist als **relativer** Versatz zur jeweiligen Geschossebene gekennzeichnet und wird beim Geschosswechsel zurückgesetzt.
- „Untergeschoss als Decke übernehmen“ kopiert die vorhandenen Flächen als echte Bodenplatten auf die aktuelle Etage, 1 H über den Ursprungsflächen. Vorhandene Geometrie wird nicht überschrieben.
- Fehlplatzierte Obergeschoss-Platten aus älteren gespeicherten Projekten werden erkannt. Sie können **explizit** über „ältere Etagenhöhen korrigieren“ repariert werden. Diese Änderung wird im Undo-Verlauf gespeichert, sie wird nicht automatisch oder ungefragt durchgeführt.
- 3D blendet die Höhen je Geschoss ein und bietet dieselbe Reparatur bei erkannter Überlagerung an.

## Abgrenzung
Die Höhen sind Planungswerte. Eine Validierung der tatsächlichen Rust-Socket- und Stabilitätsregeln oder der Physik bei speziellen Bunkermechaniken ist noch ausstehend.

## Testumfang
47 lokale Tests bestanden, inklusive Kopieren der Bodenplatten auf eine höhere Etage, Vererbung von 0.5-H-Fundamenthöhen, Überschneidungsschutz und alter 3-Etagen-Speicherstände. GitHub-CI muss vor der Veröffentlichung erneut bestätigen.
