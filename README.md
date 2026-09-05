# salzamt.vip

Die Website des Salzamtes: Wünsche und Beschwerden aller Art. Seit 1848 folgenlos.

Eine rein statische Seite (HTML, CSS, JavaScript ohne Build-Schritt), gehostet über GitHub Pages
unter [salzamt.vip](https://salzamt.vip). Es gibt kein Backend: Beschwerden landen im Papierkorb,
Bestellungen werden nur im Browser „bearbeitet“, nichts wird gespeichert oder versendet.

## Seiten

| Datei             | Inhalt                                                    |
| ----------------- | --------------------------------------------------------- |
| `index.html`      | Startseite                                                |
| `beschwerde.html` | Formular SA-47/B zum Einreichen einer Beschwerde          |
| `shop.html`       | Amtsshop                                                  |
| `kassa.html`      | Warenkorb, Kassa und Zahlungsanweisung (Bargeld per Post) |
| `team.html`       | Die Bediensteten                                          |
| `mail/`, `email/` | Weiterleitung nach https://mail.salzamt.vip/              |

`PLAN.md` beschreibt Aufbau, Design-System und Arbeitspakete im Detail.

## Lokal ansehen

Im Projektverzeichnis einen beliebigen statischen Webserver starten, zum Beispiel:

```bash
npx http-server -p 8080 .
# oder
python3 -m http.server 8080
```

Danach `http://localhost:8080/` im Browser öffnen. Ein direktes Öffnen der HTML-Dateien
(`file://`) funktioniert ebenfalls, nur die Schriften werden dann eventuell später geladen.

## Bilder

Die Originale liegen in `originals/`: die Grafiken (`salzamt_poster.png`, `salzamt_circle.png`,
`salzamt.png`, `salzamt_stamp.png`, `Salzbug_Postkarte_A6.png`, `Wappen-Postkarte-A6.png`, `amtssiegel.jpg`) und
je Bediensteten ein Foto und eine Tuschezeichnung (`team-<name>-photo.jpg`, `team-<name>-sketch.jpg`).
Die Seiten verwenden ausschließlich die verkleinerten Ableitungen in `assets/img/`.

Ableitungen neu erzeugen (benötigt Node und Playwright mit Chromium):

```bash
npm i -g playwright && npx playwright install chromium   # einmalig, falls nicht vorhanden
node tools/resize-images.js
```

## Qualitätsprüfung

`tools/qa.js` prüft alle Seiten mit Playwright (Screenshots bei 390 und 1280 Pixel Breite in
`qa-screenshots/`, Konsolenfehler, fehlende Ressourcen, interne Verweise) und spielt die drei
Abläufe durch: Beschwerde einbringen, Bestellung aufgeben, Bedienstete anzeigen.

```bash
npx http-server -p 8080 -s -c-1 .     # in einem zweiten Terminal
node tools/qa.js
```

### Porträts der Bediensteten

Die Seiten zeigen `assets/img/team-<name>.jpg` (440 × 440 Pixel, auf das Gesicht zugeschnitten).
Welche Variante aus `originals/` dafür gerendert wird, legt die Konstante `TEAM_VARIANT` in
`tools/resize-images.js` fest: `"sketch"` (Tuschezeichnung, Standard) oder `"photo"`. Nach einer
Änderung das Skript erneut ausführen. Die Bildausschnitte je Person stehen ebenfalls dort.

Fehlt eine Porträtdatei, zeigt die Seite an ihrer Stelle einen Kreis mit dem Hinweis
„Lichtbild in Bearbeitung“.
