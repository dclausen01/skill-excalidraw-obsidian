# Design: `line`-Primitiv und `tabelle`-Helfer (Stufe 4, Teil 1)

**Datum:** 2026-07-23
**Kontext:** Erster Baustein der Stufe 4 (Spezialkomponenten) des Excalidraw-Tafelbild-Skills. Aus dem Praxistest (Kant-Kategoriensystem, 2026-07-22) kam der konkrete Wunsch nach vertikalen Trennlinien in einer Ausfüll-Tabelle; dafür fehlt bislang jedes Primitiv. `line` ist zugleich das Fundament für das spätere Dreieck (Spec-Hauptdokument 8.2: Dreieck = geschlossenes `line`-Element mit Füllung).

**Nicht in diesem Zyklus:** Dreieck, Mengenkreise/Venn, Programmablaufplan (je eigener Zyklus). Füllung/Deckkraft von geschlossenen Linien (gehört zum Dreieck-Zyklus).

## 1. Überblick

Zwei neue, aufeinander aufbauende Einheiten:

1. **`line`** — ein punktbasiertes Linien-Primitiv (offene Strecke oder geschlossener Umriss), ohne gebundenen Text und ohne Füllung. Deckt Trennlinien und dekorative Rahmen; ist die Geometriebasis fürs Dreieck.
2. **`tabelle`** — ein Layout-Helfer, der aus Kopfzeile + optionalem Inhalt eine Ausfüll- oder Vergleichstabelle komponiert. Nutzt intern `line` (Trennlinien) und die bestehenden Text-/Form-Fabriken (Kopf, gefüllte Zellen). Keine neue Geometrie außer `line`.

## 2. Das `line`-Primitiv

### 2.1 API

```js
f.line(punkte, { rolle = "kontext", geschlossen = false, strichbreite? })
```

- `punkte`: Array frame-relativer `[x, y]`-Punkte, mindestens zwei. Beispiel senkrechte Trennlinie: `f.line([[600, 200], [600, 800]])`.
- `geschlossen: true`: verbindet den letzten Punkt mit dem ersten (geschlossener Umriss). Fundament fürs Dreieck und für dekorative Rahmen.
- `rolle`: Strichfarbe aus dem Hausstil, Standard `kontext` (dezentes Grau). Siehe `references/hausstil.md`.
- `strichbreite`: optionale Strichstärke; ohne Angabe der Excalidraw-Standard (dünn).
- **Keine Füllung.** Die Füllungs-/Deckkraft-Frage gehört zum Dreieck-Zyklus.
- Rückgabe: das Linien-Element (kein `{ container, text }`, weil `line` keinen gebundenen Text trägt).

`f.line` liegt wie die übrigen Form-Methoden auf dem Frame und platziert frame-relativ.

### 2.2 Elementstruktur (Spike bestätigt, 2026-07-23)

Umgesetzt als Excalidraw-`line`-Element (`type: "line"`), punktbasiert wie `arrowElement` (Vorlage in `lib/connect.js`), aber ohne Pfeilspitzen und Bindungen. Der Spike (`scratchpad/line-spike.mjs`, gerendert und angesehen) hat bestätigt:

- **Offene Linie rendert sauber.** Felder wie beim Pfeil, mit den Abweichungen unten.
- **Geschlossene Form über Loopback:** den ersten Punkt zusätzlich als **letzten** Punkt anhängen (`points: [p0, p1, p2, p0]`). Damit rendert Excalidraw 0.18.1 einen geschlossenen Umriss und füllt ihn (Füllung im Dreieck-Zyklus, hier nicht genutzt).
- **Das `polygon: true`-Flag wird NICHT beachtet** — eine nicht-geloopte Punktfolge mit `polygon: true` rendert als offener Pfad ohne Schließen/Füllung. Also **immer Loopback**, kein Flag.

Konkrete Feldwerte des `line`-Elements (abgeleitet aus `arrowElement`):

```js
{
  id,                          // elementId(`line:<schlüssel>`, ordnung)
  type: "line",
  x, y,                        // Position des ersten Punkts (absolut, nach frame-relativer Umrechnung)
  width: <bbox-Breite>, height: <bbox-Höhe>,   // aus den Punkten (max−min je Achse)
  angle: 0,
  strokeColor: <Rolle.strich>, // Standard kontext "#868e96"
  backgroundColor: "transparent",
  fillStyle: STRICH.fillStyle, // "solid" (irrelevant ohne Füllung)
  strokeWidth: strichbreite ?? STRICH.strokeWidth,  // 2
  strokeStyle: "solid",
  roughness: STRICH.roughness, // 1 — die leichte Handzeichnung passt zum Hausstil
  opacity: 100,
  groupIds: [],
  frameId,                     // Frame-Zugehörigkeit (wie andere Kinder)
  index: "a0",                 // von scene.elements() überschrieben
  roundness: null,             // gerade Segmente, keine Rundung
  seed: seedFor(id), version: 1, versionNonce: versionNonceFor(id),
  isDeleted: false, boundElements: [], updated: 1, link: null, locked: false,
  points,                      // [[0,0], [dx1,dy1], …]; geschlossen: erster Punkt am Ende wiederholt
  lastCommittedPoint: null,
  startArrowhead: null, endArrowhead: null,
  startBinding: null, endBinding: null,
}
```

`points` sind Offsets vom eigenen `x`/`y`; der erste Punkt liegt im Ursprung `[0,0]`. `x`/`y` = min-Ecke der absoluten Punkte, `points` entsprechend verschoben, `width`/`height` = Spannweite.

### 2.3 Determinismus

Inhaltsbasierte id/seed/versionNonce wie alle Elemente (`elementId`/`seedFor`/`versionNonceFor` aus `lib/ids.js`), abgeleitet aus einem Inhaltsschlüssel (z. B. `line:<punkte>`), damit dieselbe Szene byte-identische Ausgabe erzeugt.

## 3. Der `tabelle`-Helfer

### 3.1 API

```js
tabelle(frame, kopf, { zeilen?, inhalt?, x = 0, y = 0, breite, zeilenhoehe = 100, rahmen = "spalten" })
```

- `kopf`: Array der Spaltenüberschriften (Strings), mindestens eine. Bestimmt die Spaltenzahl `n = kopf.length`.
- Genau **eine** der beiden Inhaltsangaben:
  - `zeilen: N` → N leere Ausfüllzeilen.
  - `inhalt: [[...], [...]]` → 2D-Array (Zeilen × Spalten). Ein leerer String `""` ist ein Ausfüllfeld (kein Textelement). Die Spaltenzahl jeder Zeile muss `n` entsprechen (sonst harter Validierungsfehler bzw. klare Ausnahme beim Bauen).
  - Sind beide oder keine gesetzt: klare Ausnahme.
- `breite`: Gesamtbreite; wird in `n` gleich breite Spalten geteilt. Pflicht (ohne Breite keine Spaltenaufteilung).
- `zeilenhoehe`: Höhe einer Körperzeile, Standard großzügig (100) fürs Handschriftliche.
- `rahmen`: `"spalten"` (Standard) = senkrechte Trennlinien zwischen den Spalten + eine waagerechte Linie unter der Kopfzeile. `"gitter"` = zusätzlich waagerechte Linien zwischen allen Zeilen. (Weitere Modi nur bei Bedarf — YAGNI.)

### 3.2 Layout

- Frame-relative Platzierung ab `(x, y)`. Spaltenbreite `breite / n`.
- **Kopfzeile:** je Spalte ein Text in **größerer Typo** (`kernbegriff`), linksbündig mit kleinem Innenabstand, oben in der Tabelle. Kopfhöhe = Texthöhe + Polsterung. (Die Hierarchie kommt über die Schriftgröße, nicht über eine Farbrolle — `textElement` kennt kein `rolle`-Argument; die Köpfe heben sich durch `kernbegriff` gegenüber den `standard`-Zellen ab.)
- **Körperzeilen:** je Zeile `zeilenhoehe` hoch. Gefüllte Zellen (`inhalt`) als Text in Standard-Typo, linksbündig mit Innenabstand; leere Zellen bleiben leer (nur die Trennlinien strukturieren — luftig, viel Schreibraum).
- **Trennlinien (`line`, Rolle `kontext`):**
  - senkrecht: an jeder inneren Spaltengrenze, von Tabellenoberkante bis -unterkante (`n − 1` Linien);
  - waagerecht: eine unter der Kopfzeile; bei `rahmen: "gitter"` zusätzlich zwischen allen Körperzeilen.
  - Kein Außenrahmen im Standard (nur innere Struktur), damit die Tabelle offen wirkt.

### 3.3 Rückgabe

```js
{ kopf: [Textelement, …], zellen: [[Zelle, …], …], linien: [Linienelement, …] }
```

`zellen` ist ein 2D-Array; ein Ausfüllfeld ist `null` (kein Element), eine gefüllte Zelle das Textelement. So kann der Aufrufer einzelne Kopf-/Zelltexte bei Bedarf weiterverbinden oder beschriften.

### 3.4 Verortung

`tabelle` gehört zu den übrigen Layout-Helfern in `lib/layout.js` und wird über `lib/index.js` exportiert (neben `row`, `column`, `grid`, `radial`, `timeline`, `stack`). Es komponiert `frame.line`, `frame.text` und `frame.box` — keine eigene Geometrie außer den Linienpositionen.

## 4. Validierung

- `line` wird ein erlaubter Elementtyp: Eintrag in `ZUSATZFELDER` in `lib/validate/structure.js` (Pflichtfelder gemäß Spike, mindestens `points`). Damit ist `line` automatisch in `ERLAUBTE_TYPEN` und `detectOutOfScope`. `line` bringt `frameId`/`index`/`link` über `basisFelder` mit, braucht also keinen `ZUSATZKONVENTIONSFELDER`-Eintrag.
- `line` wird **aus der Überlappungsprüfung ausgenommen** (`lib/validate/layout.js`) — wie Pfeile. Eine Trennlinie hat eine dünne Bounding-Box und sitzt absichtlich zwischen bzw. an den Zellen; ohne Ausnahme gäbe es Falschwarnungen (dieselbe Lektion wie bei Pfeilen in Stufe 3a/3b).
- `checkTextFit` ist bereits auf `rectangle`/`ellipse`/`diamond` begrenzt und fasst `line` (kein gebundener Text) nicht an.

## 5. Tests

Durchgängig TDD, wie in allen bisherigen Stufen.

- **Spike zuerst** (Wegwerf): echte `line`-Elementstruktur (offen und geschlossen) gegen ein Rendering; Ergebnis in Abschnitt 2.2 zurückschreiben.
- **Unit-Tests `lineElement`:** korrekte Punkte/Bounding-Box; `geschlossen` schließt den Umriss; Determinismus (dieselbe Szene → identische Ausgabe); Strichfarbe aus der Rolle.
- **Unit-Tests `tabelle`:** Spaltenzahl aus `kopf`; Trennlinien-Positionen (senkrecht an Spaltengrenzen, waagerecht unter dem Kopf); `zeilen` erzeugt leere Zeilen (Zellen `null`); `inhalt` füllt Zellen und lässt `""` leer; `rahmen: "gitter"` fügt Zeilenlinien hinzu; Fehlerfälle (weder/beide Inhaltsangaben, falsche Spaltenzahl in `inhalt`).
- **Validator-Tests:** `line` ist erlaubter Typ; eine Trennlinie über/zwischen Kästen erzeugt **keine** Überlappungswarnung; eine echte Formüberlappung warnt weiterhin.
- **Golden-Referenz:** ein Ausfüll-Tabellen-Board (z. B. 3-Spalten-Kategorientafel mit Kopf + einigen leeren Zeilen). Der Controller sieht sich das Rendering selbst an und prüft: Trennlinien sitzen an den Spaltengrenzen, Kopflinie unter dem Kopf, genug Schreibraum, dezentes Grau. Byte-identischer Golden-Test danach.

## 6. Dateistruktur

| Datei | Änderung |
|---|---|
| `lib/elements.js` | neue Fabrik `lineElement` (neben `boxElement`/`imageElement`) |
| `lib/scene.js` | Methode `f.line(...)` im zurückgegebenen Frame-Objekt |
| `lib/layout.js` | neuer Helfer `tabelle(...)` |
| `lib/index.js` | Export `tabelle` |
| `lib/validate/structure.js` | `line` in `ZUSATZFELDER` |
| `lib/validate/layout.js` | `line` aus der Überlappungsprüfung ausnehmen |
| `references/{builder-api,muster}.md` | `f.line` und `tabelle` dokumentieren; „Noch nicht baubar" um Trennlinien/Tabellenrahmen kürzen |
| `tests/…` | Spike, Unit-, Validator-, Golden-Tests wie in Abschnitt 5 |

## 7. Reihenfolge (grobe Task-Gliederung, verfeinert der Plan)

1. `line`-Spike → Abschnitt 2.2 füllen.
2. `lineElement` + `f.line` (Unit-Tests).
3. `line` in den Validator (erlaubter Typ, Überlappungs-Ausnahme).
4. `tabelle`-Helfer (Unit-Tests, beide Inhaltsmodi, `rahmen`-Modi).
5. Referenzen (`builder-api.md`, `muster.md`) aktualisieren.
6. Golden-Referenz (Ausfüll-Tabelle), Controller sieht sie an.

## 8. Hausstil und Konsistenz

- Trennlinien in `kontext`-Grau, dünn — strukturieren ohne zu dominieren.
- Deutsche Bezeichner/Optionsschlüssel (`punkte`, `geschlossen`, `zeilen`, `inhalt`, `rahmen`) konsistent mit dem übrigen Builder.
- Determinismus überall: inhaltsbasierte ids/seeds, byte-identische Ausgabe und Golden-PNGs.
