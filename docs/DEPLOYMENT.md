# GHOSTFRAME – Live-Vorschau über GitHub Pages

## Ziel
Die React-Anwendung wird direkt aus `main` automatisch gebaut, getestet und über GitHub Pages veröffentlicht.

**Geplante Web-Adresse:** https://erbi112.github.io/Rust-Stability-Raid-Calculator/

## Einmalige Aktivierung (Repo-Administrator)
1. `https://github.com/Erbi112/Rust-Stability-Raid-Calculator/settings/pages` öffnen.
2. Unter **Build and deployment → Source** den Wert **GitHub Actions** wählen.
3. Falls der erste Deployment-Lauf vor der Aktivierung fehlgeschlagen ist: **Actions → Test, Build & Publish → Run workflow** manuell starten.
4. Den Erfolg unter **Actions** prüfen und danach die Web-Adresse öffnen.

## Automatischer Ablauf
Bei jedem Push auf `main`:
- Dependencies installieren
- Node-Tests durchführen
- TypeScript prüfen
- Vite-Produktion bauen (`dist/`)
- GitHub-Pages-Artefakt hochladen
- Nach erfolgreichem Test-/Build-Job zu Pages deployen

Pull Requests führen Tests und Build aus, **ohne** die öffentliche Vorschau zu überschreiben.

## Implementierungshinweise
- `vite.config.ts` setzt für Produktionsbuilds den Projektpfad als Vite-`base`. Für `npm run dev` bleibt der Pfad `/`.
- Der Pages-Workflow ist in `.github/workflows/core-tests.yml` enthalten. Kein weiterer paralleler Deploy-Workflow nötig.
- **Lokal gespeicherte Projekte** bleiben im jeweiligen Browserprofil (IndexedDB) auf dem Gerät. Sie werden nicht automatisch zwischen Geräten synchronisiert oder im GitHub-Repository abgelegt.
- Exportiere JSON, bevor du Browserdaten löschst oder das Gerät wechselst.
- Falls Pages noch nicht aktiviert ist, kann der Deploy-Job scheitern, auch wenn Tests und Build erfolgreich sind. Das ist keine App-Fehlfunktion.

## Troubleshooting
- 404: Prüfe, ob Pages aktiviert wurde und Deployment erfolgreich war.
- Leere Seite / fehlende JS-/CSS-Dateien: `base` in Vite prüfen und Build erneut auslösen.
- Deploy-Job mit Hinweis auf Pages-Konfiguration: **Settings → Pages → Source: GitHub Actions**.
