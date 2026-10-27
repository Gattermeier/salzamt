# salzamt.vip

Die Website des Salzamtes: Wünsche und Beschwerden aller Art. Seit 1848 folgenlos.

Eine rein statische Seite (HTML, CSS, JavaScript ohne Build-Schritt), gehostet über GitHub Pages
unter [salzamt.vip](https://salzamt.vip). Es gibt kein eigenes Backend: Beschwerden werden über
den Formulardienst [Web3Forms](https://web3forms.com/) als E-Mail an die Einlaufstelle zugestellt
(siehe unten), Bestellungen werden nur im Browser „bearbeitet“, sonst wird nichts gespeichert.

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

## Einlaufstelle (Zustellung der Beschwerden)

Das Formular SA-47/B schickt jede gültige Beschwerde per `fetch` als JSON an
`https://api.web3forms.com/submit`; Web3Forms stellt sie als E-Mail an die beim Access Key
hinterlegte Adresse zu. Die Zustellung läuft während der Papierkorb-Animation. Gelingt sie,
erscheint die Eingangsbestätigung (mit demselben Aktenzeichen wie in der E-Mail); scheitert sie,
bleibt das Formular samt Eingaben stehen und ein Hinweis „Postlauf gestört“ bittet um erneutes
Einbringen.

Einrichtung:

1. Auf [web3forms.com](https://web3forms.com/) einen Access Key für die Empfangsadresse
   (z. B. `einlaufstelle@salzamt.vip`) erzeugen. Der Key ist öffentlich und darf im HTML stehen.
2. Den Key in `beschwerde.html` am `<form id="complaint-form">` in `data-access-key` eintragen.
   Solange das Attribut leer ist, wird nichts versendet; das Formular spielt dann nur seine Rolle
   (praktisch für lokale Entwicklung) und die Konsole meldet es als Warnung.
3. Sollen mehrere Adressen die Beschwerden erhalten, in Private Email eine Weiterleitungsregel
   für die Empfangsadresse anlegen (der kostenlose Web3Forms-Plan kennt nur einen Empfänger).

Schutz vor Automaten: ein unsichtbares Honeypot-Feld (`botcheck`, von Web3Forms ausgewertet) und
die „Automatenprüfung“ (hCaptcha, gerendert durch `https://web3forms.com/client/script.js`).
Das Captcha wird nur verlangt, wenn das Widget tatsächlich geladen wurde; kann es nicht laden,
bleibt das Formular benutzbar und Web3Forms verlässt sich auf den Honeypot. Die E-Mail enthält
alle Felder in Formularreihenfolge („Abschnitt A · Vorname“ …), Aktenzeichen und Eingangszeit.

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
`qa-screenshots/`, Konsolenfehler, fehlende Ressourcen, interne Verweise) und spielt die Abläufe
durch: Beschwerde einbringen (Zustellung gelingt; Zustellung scheitert), Bestellung aufgeben,
Bedienstete anzeigen. Web3Forms und hCaptcha werden dabei nicht kontaktiert: der Lauf ersetzt
die Skripte durch leere Dateien und beantwortet den Submit-Endpunkt selbst; er prüft, dass genau
eine Zustellung mit den erwarteten Feldern abgeht. `QA_DUMP_PAYLOAD=1` gibt die Nutzlast aus.

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
