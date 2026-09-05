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

Die Originalgrafiken liegen im Wurzelverzeichnis (`salzamt_poster.png`, `salzamt_circle.png`,
`salzamt.png`, `salzamt_stamp.png`, `Salzbug_Postkarte_A6.png`, `Wappen-Postkarte-A6.png`).
Die Seiten verwenden ausschließlich die verkleinerten Ableitungen in `assets/img/`.

Ableitungen neu erzeugen (benötigt Node und Playwright mit Chromium):

```bash
npm i -g playwright && npx playwright install chromium   # einmalig, falls nicht vorhanden
node tools/resize-images.js
```

### Fotos der Bediensteten nachreichen

Die Fotos sind noch nicht im Repository. Sie werden unter genau diesen Dateinamen erwartet
(quadratischer Ausschnitt, mindestens 600 × 600 Pixel, JPEG):

```
assets/img/team-martin-gattermeier.jpg
assets/img/team-alexander-fellner.jpg
assets/img/team-katharina-gattermeier.jpg
```

Solange eine Datei fehlt, zeigt die Seite an ihrer Stelle einen Kreis mit dem Hinweis
„Lichtbild in Bearbeitung“. Sobald die Datei vorhanden ist, erscheint das Foto ohne weitere
Änderung am Code.
