# Spezifikation: Skill „Excalidraw-Tafelbild"

**Datum:** 2026-07-20
**Autor:** Dennis Clausen (Anforderungen) / Claude (Ausarbeitung)
**Status:** Design abgestimmt, bereit für Implementierungsplanung

---

## 1. Ziel

Ein Claude-Code-Skill, mit dem im Dialog Excalidraw-Tafelbilder und Schaubilder für den
Obsidian-Vault `/Users/dennis/Tafelbilder` entstehen. Der Skill schreibt vollständige
`.excalidraw.md`-Dateien, die in Obsidian direkt geöffnet werden können, und prüft das
Ergebnis vor der Auslieferung selbst — strukturell und visuell.

### Nutzungskontext

Dennis Clausen ist Lehrer für Philosophie und Informatik sowie Abteilungsleiter am
BBZ Rendsburg-Eckernförde. Die Boards dienen dem Unterricht (Tafelbilder, Erklärgrafiken)
und werden am Beamer gezeigt, wobei er wie bei Prezi in Bereiche hineinzoomt —
Leitbild ist eine **Wandzeitung mit Zoom-Ebenen**.

### Abgestimmte Rahmenentscheidungen

| Frage | Entscheidung |
|---|---|
| Hauptanwendungsfall | Unterrichts-Tafelbilder (A) und fertige Erklär-Grafiken (B); interaktive Boards (C) seltener |
| Inhaltsquelle | Überwiegend Prompt im Chat; gelegentlich Bearbeitung bestehender Boards; selten aus Gliederung |
| Qualitätssicherung | Validator **und** echtes Rendering (Puppeteer) |
| Architektur | Bausteine + Komposition (Builder-Library, kein Auto-Layout-Algorithmus) |
| Stil | Neu definiert, beamertauglich mit Zoom-Ebenen |
| Ablauf | Struktur-Gate vor dem Zeichnen — immer, nicht adaptiv |
| Speicherort | Projektordner `Skill_Excalidraw_erstellen/`, per Symlink nach `~/.claude/skills/` |
| Dateiformat beim Schreiben | Unkomprimiertes JSON im Markdown |

---

## 2. Verifizierte Fakten zum Dateiformat

Alle folgenden Angaben wurden am 2026-07-20 an echten Dateien des Vaults geprüft,
nicht aus Dokumentation übernommen. Plugin-Version **2.23.12**.

### 2.1 Markdown-Rahmen

```
---
excalidraw-plugin: parsed
tags:
  - excalidraw
excalidraw-onload-script: "\"if (app.isMobile) ea.getExcalidrawAPI().setActiveTool({type: 'hand'})\""
---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==

# Excalidraw Data

## Text Elements
<Text des Elements> ^<elementId>

## Element Links
<elementId>: [[Zielnotiz]]

## Embedded Files
<sha1-der-bilddatei>: [[Bild.png]]

%%
## Drawing
```json
{ … Szene … }
```
%%
```

- Die Sektionen `## Element Links` und `## Embedded Files` entfallen, wenn leer.
- `%%` beginnt **vor** `## Drawing`; alles darunter ist für Obsidian ein Kommentar.
- Die Sektion `## Text Elements` ist Obsidians Suchindex. Jedes Textelement muss dort
  mit seiner Block-Referenz `^<elementId>` gespiegelt werden.

  **Diese Sektion ist grundsätzlich mehrdeutig** (erhoben am 2026-07-21). Sie enthält
  beliebigen Nutzertext, und ein Eintrag ist syntaktisch nicht von Textinhalt zu
  unterscheiden. Zwei belegte Fälle, beide für diesen Vault realistisch:
  - Ein Text mit Absatz, dessen erster Teil auf `^abc12345` endet, sieht aus wie ein
    eigener Eintrag. Obsidians Blockreferenz-Syntax ist genau das — und im Vault liegt
    ein Tafelbild über Obsidian.
  - Ein Text, dessen Zeile mit `## ` beginnt, sieht aus wie eine Sektionsüberschrift und
    schneidet die Sektion ab.

  Folge für den Validator: Die **Vorwärtsrichtung** („steht jedes Textelement im Index?")
  wird geprüft, indem für jedes Element gezielt nach seiner erwarteten Zeile gesucht wird
  — das ist durch fremden Textinhalt nicht täuschbar und bleibt ein **harter Fehler**.
  Die **Rückrichtung** („nennt der Index ein Element, das es nicht gibt?") ist nicht
  zuverlässig entscheidbar und ist deshalb nur eine **Warnung**, deren Meldung auf die
  mögliche Fehlmeldung hinweist. Ein blockierter gültiger Tafelbild-Entwurf wäre der
  schlimmere Fehler als ein übersehener verwaister Eintrag.
- Beim Schreiben wird der JSON-Block als ` ```json ` ausgegeben (unkomprimiert). Das Plugin
  liest das und komprimiert beim nächsten eigenen Speichern selbstständig nach
  ` ```compressed-json ` (Einstellung `compress: true`).

### 2.2 Szenen-Objekt

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag2.23.12",
  "elements": [ … ],
  "appState": { "theme": "light", "viewBackgroundColor": "#ffffff", "gridSize": 20, … },
  "files": {}
}
```

`files` bleibt **leer**. Bilder werden ausschließlich über die Markdown-Sektion
`## Embedded Files` aufgelöst.

Die Versionsnummer in `source` wird zur Laufzeit aus
`.obsidian/plugins/obsidian-excalidraw-plugin/manifest.json` gelesen, nicht fest
eingetragen — sonst veraltet sie beim nächsten Plugin-Update stillschweigend.

### 2.3 Schriften

| Wert | Schrift | `lineHeight` | Vorkommen im Vault |
|---|---|---|---|
| `fontFamily: 5` | Excalifont (handgezeichnet) | **1.25** | 1624 |
| `fontFamily: 6` | Nunito (serifenlos) | **1.35** | 72 |
| `fontFamily: 1` | Virgil (Vorgänger von Excalifont) | 1.25 | 2280 |
| `fontFamily: 2` | Helvetica | 1.15 | 82 |
| `fontFamily: 3` | Cascadia | 1.25 | 45 |
| `fontFamily: 7` / `8` | Lilita / Comic Shanns | 1.15 / 1.25 | 2 / 36 |

**`lineHeight` ist eine Konstante der Schrift, kein globaler Wert.** Erhoben an allen
4141 Textelementen des Vaults: `fontFamily: 5` führt ausnahmslos 1.25, `fontFamily: 6`
führt 1.35 (Werte von 1.25 dort stammen aus älteren Dateien vor einer Plugin-Änderung).
Eine ältere Fassung dieser Spezifikation nahm pauschal 1.25 an — das ist für Nunito falsch
und hätte alle Höhenberechnungen für Fließtext um 8 % verfälscht.

**Der Skill erzeugt ausschließlich `5` und `6`.** Die übrigen Werte müssen aber beim
*Lesen* bestehender Boards toleriert werden: `fontFamily: 1` ist im Vault sogar der
häufigste Wert, weil ältere Tafelbilder noch mit Virgil entstanden sind.

### 2.4 Pfeil-Bindings (neues Format)

```json
"startBinding": { "elementId": "bSM1HpJh", "mode": "orbit", "fixedPoint": [0.864, 0.136] },
"endBinding":   { "elementId": "e6A9CTF7", "mode": "orbit", "fixedPoint": [0.0, 0.5001] }
```

`fixedPoint` ist ein normalisierter Punkt auf der Bounding-Box des Zielelements
(0..1 in x und y). Kein `focus`/`gap` mehr. Der Ankerpunkt ist damit deterministisch
setzbar. Die Gegenseite muss in `boundElements` des Zielelements eingetragen sein:

```json
"boundElements": [ { "id": "mWJWs21V", "type": "arrow" } ]
```

### 2.5 Bild-Referenzen

`fileId` ist der **SHA-1 der Bilddatei-Bytes**. Nachgerechnet und bestätigt an
`Anhänge/Pasted Image 20260611133423_737.png` → `0b791c0243821e0971a3d4b2e758f65546e8b6e0`.

Bildelemente führen zusätzlich `status: "pending"`, `scale: [1, 1]` und `crop: null`.

### 2.6 Weitere Elementfelder

- `index`: fraktionaler Index für die z-Reihenfolge (`"a0"`, `"a1"`, …), muss aufsteigend sein.
- `seed`, `versionNonce`: steuern den handgezeichneten Zufall bzw. Konfliktauflösung.
- Textelemente führen `text`, `rawText` und `originalText`. Bei Transklusionen enthält
  `rawText` den Verweis `![[Notiz#Abschnitt]]`, `text` den aufgelösten Inhalt.
- `gridSize: 20` in `appState` — deckt sich mit der Basiseinheit des Hausstils.

### 2.7 Bestätigte Höhenformel

`height = Zeilenzahl × fontSize × lineHeight`

Exakt bestätigt (Abweichung < 0,01 px) an allen Textelementen einer Referenzdatei,
ein- wie mehrzeilig. Die Höhe ist damit **berechenbar, nicht messbar** — nur die
**Breite** erfordert echte Schriftmetrik. Das verkleinert die riskante Fläche der
Textmessung auf eine einzige Größe.

---

## 3. Architektur

Der Skill trennt strikt zwischen **Wissen** (Markdown, wird gelesen) und
**Werkzeug** (Node-Code, wird ausgeführt).

- Ins Werkzeug gehört alles deterministisch Berechenbare: Textmaße, Bindings, Abstände,
  Geometrie, Validierung, Rendering.
- Beim Modell bleibt alles, was Urteilsvermögen braucht: inhaltliche Gliederung,
  Wahl des Kompositionsmusters, Beurteilung des gerenderten Bildes.

### 3.1 Das Szenen-Skript

Pro Board wird ein kurzes JavaScript-Modul im Scratchpad geschrieben, das die Builder-API
aufruft. Kein eigenes DSL. Begründung: Schleifen, Variablen und Wiederverwendung sind
gratis, und keine Beschreibungssprache muss erfunden werden, die irgendwann an ihre
Grenzen stößt. Das Skript ist ein Wegwerf-Artefakt und landet **nicht** im Vault.

```js
import { scene, radial, box } from "../lib/index.js";

const s = scene({ titel: "Der Mensch als Mängelwesen" });
const kap = s.frame("Instinktarmut");
const zentrum = kap.box("Mängelwesen", { rolle: "kern", text: "kernbegriff" });
radial(kap, zentrum, [
  box("Keine spezialisierten Organe"),
  box("Kein Instinktkorsett"),
  box("Physiologische Frühgeburt"),
], { radius: 420 });
export default s;
```

### 3.2 Pipeline (Neuanlage)

```
Anfrage
  │
  ├─ ① Struktur-Gate ─────────────► Freigabe durch Dennis
  │     Textgliederung: Frames, Knoten, Beziehungen, Zoom-Ebenen
  │
  ├─ ② Szenen-Skript schreiben  ◄───────────┐
  ├─ ③ build   → Szene-JSON                 │
  ├─ ④ validate → harte Fehler? ────────────┤
  ├─ ⑤ render  → PNGs ansehen, Layout ok? ──┘
  ├─ ⑥ .excalidraw.md in den Vault schreiben
  └─ ⑦ Vorschau zeigen ──────────► Freigabe durch Dennis
```

Zwei Gates für den Nutzer (① und ⑦), zwei Schleifen für das Modell (④ und ⑤).
Die inneren Schleifen laufen ohne Nutzerbeteiligung — das ist der Zweck der
Puppeteer-Investition.

### 3.3 Pipeline (Bearbeitung bestehender Boards)

```
Zieldatei
  ├─ read: dekomprimieren, Elemente und Belegung des Raums zusammenfassen
  ├─ Sicherungskopie anlegen
  ├─ ① Struktur-Gate für die Änderung
  ├─ ② Änderungsskript: vorhandene Elemente per ID referenzieren,
  │     bestehende Koordinaten unangetastet lassen
  ├─ ③–⑤ wie oben; neue Elemente werden in vom Validator ermittelten Freiraum gesetzt
  └─ ⑥ zurückschreiben
```

---

## 4. Hausstil

### 4.1 Zoom-Ebenen

Die zentrale Festlegung: **Ein Kapitel-Frame ist 1920 × 1080 Szeneneinheiten.**
Auf Zoomstufe L1 füllt ein Frame den Beamer, eine Szeneneinheit entspricht einem Pixel.
Damit wird Lesbarkeit rechenbar statt Geschmackssache.

| Stufe | Sichtfeld | Zoomfaktor |
|---|---|---|
| **L0 Übersicht** | ganzes Board | `min(1920 / boardBreite, 1080 / boardHöhe)`, aus der tatsächlichen Boardgröße berechnet |
| **L1 Kapitel** | ein Frame | `1.0` |
| **L2 Detail** | Ausschnitt | `2.5` |

**Lesbarkeitsregel:** Ein Textelement ist auf einer Stufe lesbar, wenn
`fontSize × Zoomfaktor(Stufe) ≥ 18`. Jedes Textelement bekommt beim Bauen eine
Zielstufe zugewiesen; der Validator prüft die Regel dagegen.

### 4.2 Typo-Skala

| Rolle | Größe | Schrift | Zielstufe |
|---|---|---|---|
| Board-Titel | ≥ 120, adaptiv | Excalifont (5) | L0 |
| Frame-Titel | ≥ 72, adaptiv | Excalifont (5) | L0 |
| Kernbegriff | 36 | Excalifont (5) | L1 |
| Standardtext | 24 | Nunito (6) | L1 |
| Detail | 18 | Nunito (6) | L1 |
| Fußnote | 14 | Nunito (6) | L2 |

**Die beiden L0-Größen sind adaptiv, nicht fest.** Nachgerechnet: Bei einem Board aus
3 × 2 Kapiteln ist der L0-Zoomfaktor 0,31 — ein Frame-Titel von 72 erscheint mit 22 px
und bleibt lesbar. Bei 4 × 3 Kapiteln sinkt der Faktor auf 0,23, und dieselben 72
ergeben nur noch 16 px: unter der Schwelle. Feste Werte würden die Lesbarkeitsregel
also ausgerechnet bei großen Wandzeitungen brechen — dort, wo L0 am wichtigsten ist.

Deshalb berechnet der Builder beide Größen aus der tatsächlichen Boardgröße:
`größe = max(untergrenze, aufrunden(18 / zoomfaktor_L0, 4))`.
Die Untergrenzen (120 bzw. 72) gelten für kleine Boards, bei denen die Rechnung
kleinere Werte zuließe, die Titel aber trotzdem Titel bleiben sollen.

Alle übrigen Größen sind fest — sie sind auf L1 verortet, wo der Zoomfaktor
per Definition 1,0 ist.

Gemischte Typografie: handgezeichnete Excalifont für Titel und Kernbegriffe
(Tafelcharakter), serifenlose Nunito für Fließ- und Detailtext (Lesbarkeit in der Fläche).

### 4.3 Farbrollen

Werte aus der offiziellen Excalidraw-Palette, damit sie im Farbwähler wiederzufinden sind.

| Rolle | Strich | Füllung | Verwendung |
|---|---|---|---|
| `neutral` | `#1e1e1e` | `#ffffff` | Standardbox, Struktur |
| `kern` | `#1971c2` | `#a5d8ff` | Kernbegriff, These |
| `kontra` | `#e03131` | `#ffc9c9` | Gegenposition, Kritik |
| `ergebnis` | `#2f9e44` | `#b2f2bb` | Fazit, Lösung |
| `frage` | `#f08c00` | `#ffec99` | Leitfrage, Arbeitsauftrag |
| `kontext` | `#868e96` | `#f1f3f5` | Quelle, Randnotiz |
| `technik` | `#6741d9` | `#d0bfff` | Code, Algorithmen, Abläufe |

### 4.4 Raster und Strichstil

- Basiseinheit **20** (entspricht `gridSize`).
- Abstände: `eng` = 40, `normal` = 80, `weit` = 160, zwischen Frames = 240.
- `strokeWidth: 2`, `roughness: 1` (handgezeichnet), `fillStyle: "solid"`.
- Rechtecke `roundness: { type: 3 }`, Pfeile `roundness: { type: 2 }`.

Begründung `fillStyle: solid`: Schraffur wird bei Beamerprojektion matschig.
Begründung `roughness: 1`: handschriftliche Live-Ergänzungen wirken dann nicht wie Fremdkörper.

---

## 5. Builder-API

Drei Ebenen, jede mit klar abgegrenzter Verantwortung.

### Ebene 1 — Primitive

`box()`, `ellipse()`, `diamond()`, `text()`, `arrow()`, `frame()`, `image()`

Nehmen semantische Rollen (`rolle: "kern"`, `text: "kernbegriff"`) statt roher Hex-Werte
und Pixelgrößen. Fehlt eine Größenangabe, wird sie aus dem gemessenen Text berechnet.

### Ebene 2 — Layout-Helfer

`row()`, `column()`, `grid()`, `radial()`, `timeline()`, `stack()`, `sequence()`

Bekommen Kinder und einen Abstands-Token (`"eng" | "normal" | "weit"`), positionieren
relativ und geben ihre Bounding-Box zurück, damit sie schachtelbar sind.
`sequence()` arbeitet auf Frame-Ebene und reiht Kapitel mit nummerierten
Übergangspfeilen auf.

### Ebene 3 — Verbindungen

`connect(a, b, { label, stil, seite })`

Eine einzige Funktion für gebundene Pfeile. Sie setzt `fixedPoint` auf beiden Seiten,
trägt den Pfeil in `boundElements` beider Formen ein und hängt bei Bedarf ein
Label-Textelement an. Bewusst zentralisiert, weil hier Handarbeit am zuverlässigsten
schiefgeht.

---

## 6. Musterkatalog

Dokumentiert in `references/muster.md`, bewusst als Prosa statt Code, damit Muster
leicht ergänzbar bleiben. Jedes Muster nennt typische Frame-Zahl und Einsatzzweck.

**Auf Board-Ebene:**
- **Wandzeitung** — Frame-Raster mit Leitfrage oben
- **Präsentationsablauf** — Kapitel-Frames als Sequenz mit nummerierten Übergängen;
  jeder Frame hat eine eigene innere Logik

**Auf Frame-Ebene:**
- Mindmap / Radial
- These – Antithese – Synthese
- Zeitstrahl
- Vierfelder-Matrix
- Prozesskette
- Schichtenmodell

**Auf Zeichenebene (Spezialkomponenten mit eigener Geometrie):**
- **Mengenkreise** (`venn`) — ineinander, nebeneinander, überschneidend.
  Excalidraw überlagert gefüllte Formen deckend, daher reduzierte Deckkraft, sodass
  Schnittmengen dunkler erscheinen. Eine Geometriefunktion berechnet
  Schnittflächen-Schwerpunkte für die Beschriftungsplatzierung.
- **Dreieck** (`triangle`) — Excalidraw hat kein Dreieck-Primitiv; umgesetzt als
  geschlossenes `line`-Element mit vier Punkten und Füllung. Beschriftung an Ecken,
  optional an Kanten und in der Fläche. Anwendungsfall: Gewaltdreieck nach Galtung.
- **Programmablaufplan** (`pap`) — nach DIN 66001: Oval (Start/Ende), Rechteck
  (Verarbeitung), Raute (Verzweigung mit Ja-/Nein-Zweigen), Parallelogramm
  (Ein-/Ausgabe). Benötigt als einzige Komponente einen echten Layout-Algorithmus:
  Hauptstrang in einer Spalte, Nein-Zweig auf einer Seitenspur, Rückführung bei
  Schleifen. Deterministisch lösbar, aber die aufwändigste Einzelkomponente.

**Ausdrücklich nicht im Umfang:** Struktogramme (Nassi-Shneiderman) — werden nicht
mehr eingesetzt.

---

## 7. Obsidian-Anbindung

- **Notiz-Links.** `box("…", { link: "[[Zielnotiz]]" })` setzt `link` am Element und
  erzeugt den Eintrag in `## Element Links`. Der Builder prüft, ob die Zielnotiz im
  Vault existiert, und warnt sonst — tote Links fallen sonst erst vor der Klasse auf.
- **Bilder.** `image("Anhänge/Datei.png", { at, breite })` berechnet den SHA-1,
  erzeugt den Eintrag in `## Embedded Files` und übernimmt das Seitenverhältnis aus
  den echten Bildmaßen.
- **Transklusion.** `transclusion("[[Notiz#Abschnitt]]", { breite })` erzeugt ein
  Textelement mit `rawText` = Verweis.
  **Bekannte Einschränkung:** Die Höhe hängt vom transkludierten Inhalt ab, der beim
  Bauen nicht bekannt ist. Der Builder reserviert einen Platzhalterbereich nach der
  Breitenangabe und markiert ihn als „Höhe unbestimmt". Beim ersten Öffnen in Obsidian
  kann der Bereich nachrutschen. **Regel:** Transklusionen erhalten einen eigenen
  Frame-Bereich und stehen nie mitten in einer dichten Komposition.

---

## 8. Validator

Zwei Härtegrade.

### Harte Fehler — Abbruch, es wird nichts in den Vault geschrieben

- Schema und Pflichtfelder je Elementtyp, gültige Enum-Werte
- Beidseitige Binding-Integrität: `boundElements` ↔ `startBinding` / `endBinding`
- `containerId` ↔ gebundener Text konsistent
- `frameId` verweist auf existierenden Frame
- IDs eindeutig
- `index`-Werte gültig und aufsteigend
- `## Text Elements` deckungsgleich mit allen Textelementen der Szene
- Referenzierte Bilddateien existieren, SHA-1 stimmt
- Verlinkte Notizen existieren im Vault

### Weiche Warnungen — werden dem Modell gemeldet, es entscheidet

- Überlappende Elemente außerhalb erlaubter Fälle (Venn, Container-Text, Frame-Inhalt)
- Gemessene Texthöhe größer als Containerhöhe
- Element ragt über seinen Frame hinaus
- Lesbarkeitsregel `fontSize × Zoomfaktor ≥ 18` verletzt
- Pfeil kreuzt eine Form, an die er nicht gebunden ist
- Frame-Abstand unter dem Minimum von 240
- Transklusion mit unbestimmter Höhe in dichter Umgebung

---

## 9. Renderer

Puppeteer lädt eine lokale HTML-Seite mit gebündeltem Excalidraw und lokal eingebetteten
Schriften. Kein Netzzugriff zur Laufzeit, keine Obsidian-Abhängigkeit.

**Ausgabe sind mehrere Bilder:** ein Gesamt-PNG für die L0-Übersicht plus je Frame ein
PNG für L1. Beide Ebenen müssen geprüft werden — „sieht auf L1 gut aus" und „ergibt auf
L0 ein lesbares Gesamtbild" sind verschiedene Fragen.

**Begründung gegen einen selbstgebauten SVG-Renderer:** Ein eigener Renderer würde für
Textmaße und Pfeilgeometrie dieselben Annahmen verwenden wie die Builder-Library. Er
würde also bestätigen, was gedacht war, statt aufzudecken, was Excalidraw tatsächlich
tut — und wäre damit genau bei den zwei Fehlerklassen blind, für die er gebaut würde.
Die echte Engine ist ein unabhängiger Zeuge.

### 9.1 Verifizierte Fakten zum Renderer

Am 2026-07-21 durch einen technischen Spike belegt, nicht aus Dokumentation übernommen.
Excalidraw 0.18.1, Puppeteer 25.3.0.

**Bündelung.** `esbuild --bundle --format=iife --platform=browser` fasst das Paket samt
seiner dynamischen Chunk-Importe zu einer Datei (13,6 MB, ~0,5 s Bauzeit). `--splitting`
ist weder nötig noch mit `iife` verträglich. `react` und `react-dom` müssen installiert
sein, obwohl kein React-Baum gemountet wird — das Paket importiert sie auf Modulebene.

**Der Weg ist `exportToBlob`, nicht `exportToSvg`.** `exportToBlob` ruft intern
`Fonts.loadElementsFonts()` auf, registriert also echte `FontFace`-Objekte, bevor ein
Pixel gezeichnet wird. `exportToSvg` holt die Schriftbytes nur zum Einbetten und fasst
`document.fonts` nie an — eine Prüfung direkt danach misst stillschweigend mit einer
Ersatzschrift und bestätigt gar nichts.

**`restoreElements` und `restoreAppState` sind Pflicht**, nicht Zierde: Sie füllen Felder
nach, die der Renderpfad voraussetzt.

**Schriftauflösung — der gefährlichste Punkt.** Excalidraw baut die Schrift-URIs zur
Laufzeit und löst sie gegen `window.EXCALIDRAW_ASSET_PATH` auf. **Ist die Variable nicht
gesetzt, lädt es die Schriften von `https://esm.sh/` — aus dem Netz, ohne jede Warnung.**
Der Renderer würde dann funktionieren, aber netzabhängig sein und nie die lokalen
Schriften prüfen. Die Variable muss gesetzt und die Schriften müssen von derselben
Herkunft ausgeliefert werden. Ein Test muss belegen, dass keine Anfrage an `esm.sh` geht.

Die im npm-Paket enthaltenen Schriftdateien sind **byte-identisch** mit den bereits unter
`assets/fonts/` abgelegten (nur die Trennzeichen im Dateinamen unterscheiden sich).

**Beweis der Schrifttreue.** An allen 8 Textelementen eines echten Boards gemessen:

| Zustand | Abweichung gemessene zu gespeicherter Breite |
|---|---|
| vor der Schriftregistrierung | −7 % bis −19 %, durchgehend zu schmal |
| nach einem `exportToBlob`-Aufruf | **0,0000 bei allen 8** |

Der Test kann also fehlschlagen und tut es auch, wenn die Schriften fehlen — er ist
aussagekräftig, kein Selbstbestätiger. Damit ist der Renderer als unabhängiger Zeuge
belegt.

**Frame-Ausschnitt.** `exportingFrame: <frameElement>` schneidet exakt auf die
Frame-Grenzen; `getDimensions(w, h) => ({ width, height, scale })` steuert die Auflösung.
`exportPadding` wird bei gesetztem `exportingFrame` ignoriert.

**Kosten.** Chromium-Start ~2 s einmalig, Seitenaufbau ~0,6 s, danach **7–10 ms je
Rendering**. Browser und Seite müssen über mehrere Renderings am Leben bleiben — sonst
kostet jedes Bild ~2,5 s statt 10 ms.

**Harmlose Nebenwirkung.** Beim Export erscheint die Konsolenwarnung
`Failed to use workers for subsetting, falling back to the main thread` — das Auslagern
der Schrift-Teilmengenbildung in einen Web Worker geht im gebündelten Zustand nicht. Der
Rückfall auf den Hauptthread erfolgt automatisch und liefert korrekte Ausgabe.

---

## 10. Stabilität

1. **`bin/doctor.mjs`** prüft Node-Version, Abhängigkeiten, Chromium, Schriftdateien und
   Vault-Pfad und meldet Fehlendes in einem verständlichen Satz. Relevant beim ersten
   Lauf auf einem weiteren Rechner.
2. **Deterministische Ausgabe.** `seed` und `versionNonce` werden aus dem Elementinhalt
   abgeleitet statt gewürfelt. Derselbe Input erzeugt byte-identische Dateien; zweimal
   Bauen verändert ein Board nicht, und Golden-Tests werden dadurch überhaupt möglich.
3. **Der Vault wird zuletzt angefasst.** Gebaut, validiert und gerendert wird
   ausschließlich im Scratchpad. Die Datei im Vault entsteht erst, wenn beide Gates
   grün sind.
4. **Kein stilles Überschreiben.** Existiert die Zieldatei bereits, wird nachgefragt.
   Beim Bearbeiten-Pfad wird vorher eine Sicherungskopie neben die Datei gelegt.

---

## 11. Tests

- **Textmessung gegen Golden-Werte aus dem Vault.** Erhoben: 627 der 632 Dateien lassen
  sich dekomprimieren (die übrigen 5 sind leer oder unkomprimiert) und liefern 4141
  Textelemente mit bekanntem Text, bekannter Schrift und Größe — samt der von Excalidraw
  berechneten Breite. Stimmt die fontkit-Messung damit überein, stimmt sie auch in Obsidian.

  **Tatsächlich verwertbare Menge (erhoben nach der Extraktion):** Von den 4141
  Textelementen tragen 1624 Excalifont und 72 Nunito. Für die *Breiten*messung taugen
  davon nur einzeilige Elemente — bei mehrzeiligen ist unbekannt, wo Excalidraw umbrochen
  hat. Nach diesem Filter und nach Entdopplung über `(Schrift, Größe, Text)` bleiben
  **454 Proben für Excalifont und 37 für Nunito** (491 gesamt). Zusätzlich verworfen: Elemente mit `autoResize: false` (dort ist `width` die vom Nutzer gezogene Boxbreite, keine Textmessung) und Schlüssel, für die der Vault widersprüchliche Breiten führt.

  **Ungleiche Abdeckung:** Die Nunito-Messung ist damit deutlich schwächer abgesichert
  als die für Excalifont. Ausgleich: Für Nunito wird die Genauigkeit zusätzlich gegen den
  Puppeteer-Renderer geprüft, der beliebig viele Referenzwerte erzeugen kann.

  **Nicht abgedeckt:** Der Zeilenumbruch selbst. Die Golden-Werte belegen die Breite
  einzelner Zeilen, nicht die Regel, nach der Excalidraw umbricht. Diese Regel wird
  erst durch den Renderer in Stufe 2 überprüfbar.
- **Roundtrip-Test.** Eine bestehende Datei einlesen und unverändert zurückschreiben
  ergibt identisches JSON.

  **Vereinfachung gegenüber dem ursprünglichen Entwurf:** Eine Komprimierungsfunktion
  wird nicht gebaut. Der Skill schreibt grundsätzlich unkomprimiert, das Plugin
  komprimiert selbst. Damit wird nur `decompress` benötigt — Code, den es nicht gibt,
  kann nicht brechen.
- **Unit-Tests** für Bindings, Layout-Helfer, Venn-Geometrie, PAP-Layout, SHA-1-Berechnung,
  Sektions-Serialisierung.
- **Golden-Render-Tests.** Vier Referenz-Boards, die alle Muster abdecken, werden
  gerendert und pixelweise gegen eingecheckte PNGs verglichen.
- **Integrationstest.** Eine echte Datei aus dem Vault vollständig durch die Pipeline
  und zurück.

---

## 12. Verzeichnisstruktur

```
Skill_Excalidraw_erstellen/
├─ SKILL.md                    Einstiegspunkt, Workflow, Entscheidungsregeln
├─ references/
│  ├─ dateiformat.md           verifizierte Formatdetails (Abschnitt 2)
│  ├─ hausstil.md              Farbrollen, Typo-Skala, Zoom-Ebenen, Abstände
│  ├─ builder-api.md           API-Referenz mit Beispielen
│  └─ muster.md                Kompositionsmuster
├─ lib/
│  ├─ index.js                 öffentliche API
│  ├─ style.js                 Hausstil-Tokens
│  ├─ text.js                  Textmessung (fontkit) + Excalidraw-Wrapping
│  ├─ elements.js              Primitive
│  ├─ layout.js                Layout-Helfer
│  ├─ shapes/                  venn.js, triangle.js, pap.js
│  ├─ obsidian.js              Links, Transklusion, Bild-SHA-1, Sektionen
│  ├─ scene.js                 Szenen-Objekt, z-Index-Vergabe, ID-Erzeugung
│  └─ document.js              Szene ↔ .excalidraw.md
├─ bin/
│  ├─ doctor.mjs               Umgebungsprüfung
│  ├─ build.mjs                Szenen-Skript ausführen → Szene-JSON
│  ├─ validate.mjs             Prüfungen
│  ├─ render.mjs               Puppeteer → PNGs
│  └─ read.mjs                 bestehende Datei einlesen und zusammenfassen
├─ assets/fonts/               Excalifont, Nunito (für Messung und Rendering)
├─ tests/
├─ docs/superpowers/specs/     dieses Dokument
└─ package.json
```

Bereitstellung auf weiteren Rechnern: Symlink von `~/.claude/skills/excalidraw-tafelbild`
auf diesen Ordner. Die konkrete Verteilung (Git-Repository o. Ä.) wird später geklärt und
ist nicht Teil dieser Spezifikation.

---

## 13. Umsetzungsreihenfolge

Die Spezifikation beschreibt mehr, als sinnvoll in einem Zug entsteht. Vier Stufen,
jede für sich benutzbar:

**Stufe 1 — Tragfähiges Fundament.**
Textmessung mit Golden-Werten aus dem Vault, `document.js` (Szene ↔ Markdown) mit
Roundtrip-Tests, Szenen-Objekt, Primitive, Hausstil-Tokens, `doctor.mjs`.
Ergebnis: Ein Board aus einigen Kästen und Texten entsteht korrekt und öffnet sich in
Obsidian. Diese Stufe entscheidet, ob das ganze Vorhaben trägt — deshalb steht die
Textmessung ganz vorn.

**Stufe 2 — Qualitätssicherung.**
Validator (harte Fehler zuerst, dann weiche Warnungen), Puppeteer-Renderer mit L0- und
L1-Ausgabe. Ergebnis: Die beiden inneren Schleifen der Pipeline laufen.

**Stufe 3 — Komposition.**
`connect()` mit `fixedPoint`-Bindings, Layout-Helfer, `sequence()` auf Frame-Ebene,
Obsidian-Anbindung (Links, Bilder, Transklusion). Ergebnis: Wandzeitungen und
Präsentationsabläufe werden möglich.

**Stufe 4 — Spezialkomponenten.**
Mengenkreise, Dreieck, Programmablaufplan, Musterkatalog, `SKILL.md` und
Referenzdokumente, Aufräumarbeiten in `CLAUDE.md`.

Die Reihenfolge folgt dem Risiko, nicht dem Nutzen: Was scheitern kann, kommt zuerst.

---

## 14. Offene Verifikationspunkte

Diese Punkte sind im Design berücksichtigt, aber noch nicht empirisch geprüft. Sie gehören
als explizite Schritte in den Implementierungsplan:

1. **Pfeilbindung an Frames.** Ob Excalidraw Pfeile direkt an Frame-Elemente binden kann,
   ist ungeklärt. Falls nicht, wird an unsichtbare Ankerpunkte am Frame-Rand gebunden.
   Betrifft das Muster „Präsentationsablauf".
2. **Wrapping-Algorithmus.** Excalidraws exakte Zeilenumbruchregeln (Umbruch an Leerzeichen,
   Behandlung überlanger Wörter, `lineHeight: 1.25`) müssen gegen die Golden-Werte aus dem
   Vault abgeglichen werden.
3. **Container-Autogrow.** Wie stark Container beim Umbruch in der Höhe wachsen
   (`BOUND_TEXT_PADDING`), ist am Datenbestand zu bestätigen.
4. **Deckkraft bei Mengenkreisen.** Der Wert, bei dem Überschneidungen gut sichtbar und
   Beschriftungen gut lesbar bleiben, ist empirisch am Rendering zu ermitteln.

---

## 15. Ausdrücklich nicht im Umfang

- Auto-Layout-Algorithmen (ELK, dagre)
- Mermaid-Import
- Freihand-Elemente
- Excalidraw-Automate-Skripte
- MCP-Server
- Struktogramme
- Automatischer `ob sync` nach dem Schreiben (Obsidian läuft im Hintergrund und
  synchronisiert selbst)

---

## 16. Begleitende Aufräumarbeiten

In `/Users/dennis/Tafelbilder/CLAUDE.md`:

- Der Verweis auf einen „excalidraw-diagram-Skill" nebst Hinweis „MCP-Server NICHT
  verwenden!" ist ein toter Verweis — der Skill existiert im Dateisystem nicht. Er wird
  durch einen Verweis auf den neuen Skill ersetzt.
- Der Abschnitt „Obsidian Headless Sync nach Dateiänderungen" wird entfernt. Die dort
  beschriebene Automatik wird nicht benötigt; bei Bedarf wird nachgefragt.
