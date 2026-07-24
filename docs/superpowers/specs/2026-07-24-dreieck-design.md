# Design: `dreieck`-Helfer (Stufe 4, Teil 2)

**Datum:** 2026-07-24
**Kontext:** Zweiter Baustein der Stufe-4-Spezialkomponenten. Baut auf dem `line`-Primitiv (Teil 1) auf: Ein Dreieck ist laut Haupt-Spec §8.2 ein geschlossenes `line`-Element mit Füllung. Anwendungsfall: das Gewaltdreieck nach Galtung (drei Gewaltformen an den Ecken). Dennis' echte Gewaltdreieck-Datei setzt die Form bislang aus Rechtecken/Bildern von Hand zusammen — es gibt keine saubere Dreiecksgeometrie; genau die liefert dieser Helfer.

**Nicht in diesem Zyklus:** Mengenkreise/Venn, Programmablaufplan. Kanten- und Flächen-Beschriftung des Dreiecks (Nutzerentscheidung: Ecken-Beschriftung; Kanten/Fläche später bei Bedarf, YAGNI).

## 1. Überblick

Zwei Änderungen, aufeinander aufbauend:

1. **`line`-Füllung:** Das `line`-Primitiv (Teil 1) bekommt eine optionale Füllung. Bisher `backgroundColor: "transparent"`; mit einer `fuellung`-Option wird die Hintergrundfarbe gesetzt (`fillStyle: "solid"`). Ohne Angabe unverändert. Genau dahin hatte Teil 1 die Füllung verschoben.
2. **`dreieck`-Helfer:** Komponiert eine geschlossene `line` (Umriss, optional gefüllt) mit drei Ecken-Textlabels zu einem gleichseitigen Dreieck (Spitze oben). Neue Datei `lib/shapes/dreieck.js`.

## 2. `line`-Füllung

### 2.1 API-Erweiterung

`lineElement` und `f.line` bekommen eine optionale `fuellung`:

```js
f.line(punkte, { rolle?, geschlossen?, strichbreite?, fuellung? })
```

- `fuellung`: Farbwert (`"#b2f2bb"`) **oder** Rollenname (`"ergebnis"` → dessen `fuellung`-Farbe aus `FARBROLLEN`). Auflösungsregel: ist `fuellung` ein Schlüssel in `FARBROLLEN`, wird `FARBROLLEN[fuellung].fuellung` genommen, sonst der Wert als literale Farbe. Setzt `backgroundColor` und `fillStyle: "solid"`. Sinnvoll nur bei `geschlossen: true` (Excalidraw füllt nur geschlossene Formen).
- Ohne `fuellung`: `backgroundColor: "transparent"` wie bisher — bestehende `line`-Aufrufe und Golden bleiben byte-identisch.
- `opacity` bleibt `100`; die dezente Wirkung kommt über eine helle Füllfarbe. (Reduzierte Deckkraft für sich überschneidende Flächen ist erst beim Venn nötig.)

### 2.2 Determinismus

Die `fuellung` fließt in den id-Schlüssel mit ein, damit zwei sonst gleiche Linien (gefüllt/ungefüllt) unterscheidbar bleiben — konsistent mit dem bestehenden `line:<punkte>:<geschlossen>`-Schlüssel, erweitert zu `line:<punkte>:<geschlossen>:<fuellung>`.

## 3. `dreieck`-Helfer

### 3.1 API

```js
dreieck(frame, [obenLabel, untenLinksLabel, untenRechtsLabel], { x = 0, y = 0, breite, hoehe?, fuellung?, rolle = "neutral", typo = "kernbegriff" })
```

- `ecken`: Array mit genau drei Label-Strings, Reihenfolge `[oben, unten-links, unten-rechts]`. Ein leerer String `""` → keine Beschriftung an dieser Ecke (kein Textelement, `null` in der Rückgabe).
- `breite`: Basisbreite (untere Kante). Pflicht.
- `hoehe`: Dreieckshöhe. Standard gleichseitig: `breite · √3/2` (≈ 0,866 · breite).
- `fuellung`: optional (Farbe/Rolle) → Umriss dezent getönt; ohne Angabe nur Umriss.
- `rolle`: Strichfarbe des Umrisses (Standard `neutral`).
- `typo`: Typo der Ecken-Labels (Standard `kernbegriff`).

### 3.2 Geometrie

Gleichseitiges Dreieck, Spitze oben, als **geschlossene `line`** (Loopback, aus dem Teil-1-Spike):

- Spitze oben: `(x + breite/2, y)`
- unten-links: `(x, y + hoehe)`
- unten-rechts: `(x + breite, y + hoehe)`
- `f.line([spitze, untenLinks, untenRechts], { geschlossen: true, rolle, fuellung })` — die Fabrik schließt via Loopback.

### 3.3 Ecken-Labels (außen platziert)

Jedes Label sitzt **außerhalb** des Umrisses in Richtung seiner Ecke, mit einem festen Abstand (`AUSSEN = 24`), damit es die Linie nicht berührt und mittig zur Ecke ausgerichtet ist. Die Textmaße kommen aus dem gebauten Textelement (`text.width`/`height`):

- **oben:** mittig über der Spitze — `x_text = spitzeX − text.width/2`, `y_text = y − AUSSEN − text.height`.
- **unten-links:** links unterhalb der linken Ecke — `x_text = x − text.width` (bündig links neben der Ecke), `y_text = y + hoehe + AUSSEN`.
- **unten-rechts:** rechts unterhalb der rechten Ecke — `x_text = x + breite`, `y_text = y + hoehe + AUSSEN`.

Die Ecken-Labels sind freistehende Texte (kein gebundener Text). Weil `line` aus der Überlappungsprüfung ausgenommen ist (Teil 1), erzeugt ein Label dicht am Umriss **keine** Falschwarnung. Labels untereinander liegen an verschiedenen Ecken weit auseinander.

### 3.4 Rückgabe

```js
{ dreieck: <line-Element>, ecken: [<Textelement|null>, <…>, <…>] }
```

`ecken` ist ein 3-Element-Array in der Eingabereihenfolge; eine leere Ecke ist `null`. So kann der Aufrufer einzelne Labels weiterverwenden.

### 3.5 Verortung

Neue Datei `lib/shapes/dreieck.js` (die Haupt-Spec §12.1 sah `lib/shapes/` für `venn`/`triangle`/`pap` vor). `dreieck` ist eine Spezialform, kein generischer Anordnungs-Helfer wie `row`/`tabelle` — daher getrennt von `lib/layout.js`. Export über `lib/index.js`. Der Helfer nutzt `frame.line` und `frame.text`; keine eigene Geometrie außer den drei Eckpunkten und den Label-Positionen.

## 4. Validierung

Keine neuen Validator-Regeln nötig: `line` ist seit Teil 1 erlaubter Typ und aus der Überlappungsprüfung ausgenommen; die Ecken-Labels sind normale Texte. Die gefüllte `line` durchläuft `checkSchema` unverändert (nur `backgroundColor`/`fillStyle` ändern sich, beide bereits erlaubte Felder).

## 5. Tests

Durchgängig TDD.

- **`line`-Füllung (Unit):** `fuellung` als Farbe setzt `backgroundColor` + `fillStyle: "solid"`; `fuellung` als Rolle löst auf `FARBROLLEN[rolle].fuellung` auf; ohne `fuellung` bleibt `transparent`; Determinismus (Füllung im id-Schlüssel).
- **`dreieck` (Unit):** drei Eckpunkte korrekt (Spitze oben, Basis unten); geschlossene Linie (Loopback → 4 Punkte); Standard-Höhe gleichseitig; drei Ecken-Labels an den erwarteten Positionen; leerer String → `null`; `fuellung` reicht bis zur Linie durch.
- **Validator:** ein Dreieck mit Ecken-Labels erzeugt **keinen** Befund (voller `validateScene`-Lauf, `findings` leer) — sichert die „neue Form → keine Falschwarnung"-Eigenschaft.
- **Golden-Referenz:** ein Gewaltdreieck (drei Galtung-Begriffe an den Ecken, nur Umriss) **und** eine gefüllte Variante, um die Tönung zu prüfen. Der Controller sieht beide Renderings an (sitzen die Labels außen und mittig? berührt nichts den Umriss? wirkt die Füllung dezent?).

## 6. Dateistruktur

| Datei | Änderung |
|---|---|
| `lib/elements.js` | `lineElement` um `fuellung` erweitern (backgroundColor/fillStyle, id-Schlüssel) |
| `lib/scene.js` | `f.line` reicht `fuellung` durch |
| `lib/shapes/dreieck.js` | **neu:** `dreieck(...)` |
| `lib/index.js` | Export `dreieck` |
| `references/{builder-api,muster}.md` | `dreieck` dokumentieren; „Noch nicht baubar" um Dreiecke kürzen |
| `tests/…` | Unit-, Validator-, Golden-Tests |

## 7. Reihenfolge (grobe Task-Gliederung, verfeinert der Plan)

1. `line`-Füllung (`lineElement`/`f.line` + Unit-Tests).
2. `dreieck`-Helfer (`lib/shapes/dreieck.js` + Unit-Tests, Export).
3. Validator-Test (Dreieck validiert ohne Befund).
4. Referenzen (`builder-api.md`, `muster.md`).
5. Golden-Referenz (Umriss + gefüllte Variante), Controller sieht sie an.

## 8. Hausstil und Konsistenz

- Deutsche Bezeichner/Optionsschlüssel (`ecken`, `breite`, `hoehe`, `fuellung`, `dreieck`) konsistent mit `tabelle`/`line`.
- Determinismus überall: inhaltsbasierte ids/seeds, byte-identische Ausgabe und Golden-PNGs; bestehende `line`-Golden bleiben unverändert (Füllung nur bei explizitem `fuellung`).
- Füll-Deckkraft/-farbe wird am Golden-Rendering kalibriert (Haupt-Spec, offener Verifikationspunkt 4).
