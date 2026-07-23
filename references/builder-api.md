# Builder-API

Ein Szenen-Skript ist ein ESM-Modul, das eine Szene baut und als Default exportiert. Import aus `lib/index.js` (absoluter Pfad, weil das Skript im Scratchpad liegt):

```js
import { scene, row, column, grid, radial, timeline, stack }
  from "/Users/dennis/Projekte/Skill_Excalidraw_erstellen/lib/index.js";

const s = scene({ titel: "Optionaler Board-Titel" });
// … Frames, Formen, Verbindungen …
export default s;
```

## Szene und Frames

- `scene({ titel? })` → Szenen-Objekt mit `.frame(...)`, `.connect(...)`, `.sequence(...)`, `.elements()`, `.dimensions()`.
- `s.frame(name, { x?, y?, breite?, hoehe? })` → Frame-Objekt. Ohne `x`/`y` wird der Frame rechts an den vorherigen gesetzt (240 Abstand). Standardgröße 1920 × 1080. Der `name` erscheint als kleines Label; für die große, aus der Distanz lesbare Überschrift **zusätzlich** ein Text mit `typo: "frametitel"` in den Frame setzen.

## Formen (frame-relativ platziert)

Alle Form-Fabriken liegen auf dem Frame und platzieren **frame-relativ** (0…1920 × 0…1080). Rückgabe: `{ container, text }` — diese Rückgabe an `connect` und Layout-Helfer weiterreichen.

```js
const f = s.frame("Kapitel");
const box     = f.box("Text",   { rolle: "kern", typo: "kernbegriff", x: 200, y: 300 });
const ellipse = f.ellipse("…",  { rolle: "ergebnis", typo: "kernbegriff", x: 800, y: 300 });
const raute   = f.diamond("…?", { rolle: "frage", typo: "kernbegriff", x: 1200, y: 300 });
f.text("Titel", { typo: "frametitel", x: 60, y: 55 });        // freistehender Text, kein Kasten
```

- `rolle` und `typo` siehe `references/hausstil.md`.
- Ohne `breite`/`hoehe` wächst der Kasten um den Text. Mit `breite: <n>` bricht der Text auf diese Breite um (gut für längere Sätze). `hoehe` erzwingen nur, wenn nötig — zu klein und der Text ragt heraus (Warnung).
- Mehrzeiliger Text: `\n` im String.

## Verbindungen — gebundene Pfeile

`s.connect(a, b, { label?, seite? })` zieht einen Pfeil von Form `a` zu Form `b`, wählt automatisch die zugewandten Kanten und bindet beide Seiten. `a`/`b` sind die `frame.box()`-Rückgaben. Optionales `label` sitzt mittig auf dem Pfeil.

```js
const ursache = f.box("Ursache", { rolle: "kern", typo: "kernbegriff", x: 200, y: 400 });
const wirkung = f.box("Wirkung", { rolle: "ergebnis", typo: "kernbegriff", x: 900, y: 400 });
s.connect(ursache, wirkung, { label: "führt zu" });
```

Der Pfeil bleibt in Obsidian verbunden, wenn Dennis eine Form verschiebt. **Die Formen müssen getrennt liegen** — überlappende oder bündige Formen ergeben einen entarteten Pfeil (Warnung).

## Obsidian-Anbindung — Links, Bilder, Transklusion

Bindet ein Board an den Vault. In Obsidian klickbar bzw. eingebettet; im Rendering ist der Link nicht sichtbar (aber gesetzt), Bilder erscheinen.

```js
// Klickbarer Notiz-Link an einer Form — als link-Option
f.box("Zur Vertiefung", { rolle: "kern", typo: "kernbegriff", x: 120, y: 300,
  link: "[[Der Mensch – ein Mängelwesen]]" });

// Eingebettetes Vault-Bild
f.image("Anhänge/schaubild.png", { x: 700, y: 300, breite: 400 });

// Transklusion eines Notiz-Abschnitts
f.transclusion("[[Mängelwesen#Definition]]", { x: 700, y: 300, breite: 600 });
```

- **`link`** (Option an `f.box`/`f.ellipse`/`f.diamond`): `"[[Notizname]]"`, optional mit `#Abschnitt`/`|Alias`. Der Validator **warnt** (blockiert nicht), wenn die Notiz nicht im Vault existiert — bewusst, damit ein Board auf eine erst noch anzulegende Notiz zeigen darf.
- **`f.image(pfad, { x?, y?, breite? })`**: `pfad` relativ zum Vault (`/Users/dennis/Tafelbilder`) oder absolut. **Das Bild muss bereits im Vault liegen** — der Validator prüft hart (Datei existiert, Inhalt per SHA-1). Höhe folgt dem echten Seitenverhältnis; ohne `breite` eine Standardbreite. Formate: png, jpg, jpeg, gif, webp (sonst Fehler).
- **`f.transclusion(verweis, { x?, y?, breite? })`**: bettet einen Notiz-Abschnitt ein. **Bekannte Grenze:** die Höhe ist beim Bauen nur ein Platzhalter (der echte Inhalt ist unbekannt) und kann beim ersten Öffnen in Obsidian nachrutschen — der Transklusion **eigenen Raum** geben, nicht in dichte Komposition setzen.

## Layout-Helfer — platzieren selbst

Jeder Helfer bekommt den Frame, die Inhalte als **Strings** und Optionen, berechnet die Positionen, ruft intern `frame.box()` auf und gibt die platzierten Formen zurück. Gemeinsame Optionen: `{ typ = "box", rolle, typo, abstand = "normal", x = 0, y = 0 }` (`typ` auch `"ellipse"`/`"diamond"`).

| Helfer | Anordnung | Rückgabe |
|---|---|---|
| `row(frame, inhalte, opts)` | nebeneinander, gleiche Höhe | `[{container,text}, …]` |
| `column(frame, inhalte, opts)` | untereinander | `[…]` |
| `grid(frame, inhalte, { spalten, … })` | Raster, `spalten` ≥ 1 | `[…]` in Eingabereihenfolge |
| `stack(frame, inhalte, opts)` | vertikal, enger Standardabstand | `[…]` |
| `radial(frame, zentrum, satelliten, { radius, x?, y? })` | Zentrum + Satelliten auf Kreis | `{ zentrum, satelliten: […] }` |
| `timeline(frame, inhalte, { szene, … })` | Reihe, benachbarte per Pfeil verbunden | `{ formen: […], pfeile: […] }` |

```js
// Mindmap
const { zentrum, satelliten } = radial(f, "Zentralbegriff",
  ["A", "B", "C", "D"], { rolle: "kern", typo: "kernbegriff", radius: 380 });
for (const sat of satelliten) s.connect(zentrum, sat);

// Prozesskette (timeline braucht die Szene, weil Pfeile über s.connect entstehen)
const { formen } = timeline(f, ["Schritt 1", "Schritt 2", "Schritt 3"],
  { szene: s, typo: "kernbegriff", x: 100, y: 400 });
```

**Radius großzügig wählen.** Bei `radial` müssen die Satelliten samt ihrer Textbreite auf den Kreis passen, ohne einander oder das Zentrum zu berühren — sonst überlappen sie (das war der häufigste Anfängerfehler). Im Zweifel größer und im Rendering prüfen.

## Präsentationsablauf

`s.sequence(frames, { nummeriert = true })` verkettet Kapitel-Frames (die `s.frame(...)`-Objekte) mit Übergangspfeilen von Frame zu Frame; bei `nummeriert` mit laufenden Nummern. Nur für den *Ablauf*-Fall, nicht für ein einzelnes Board.

```js
const k1 = s.frame("Einstieg");
const k2 = s.frame("These");
const k3 = s.frame("Folgerung");
// … Inhalte in jedes Kapitel …
s.sequence([k1, k2, k3], { nummeriert: true });
```

## Kommandozeilen

| Befehl | Zweck |
|---|---|
| `node bin/doctor.mjs` | Umgebung prüfen (Node, Vault, Schriften, Plugin) |
| `npm run build-renderer` | Renderer-Bündel bauen (einmalig, falls `renderer/dist/` fehlt) |
| `node bin/build.mjs <skript> <ziel> --renders <dir>` | bauen → validieren → rendern → schreiben |
| `node bin/build.mjs <skript> <ziel> --skip-render` | ohne Rendering (nur wenn schon geprüft) |
| `node bin/validate.mjs <datei>` | eine bestehende Datei prüfen |
| `node bin/render.mjs <datei> <dir>` | eine bestehende Datei rendern |

`bin/build.mjs` schreibt **erst nach** erfolgreicher Validierung und (sofern nicht `--skip-render`) Rendering. Harte Fehler brechen ab, nichts wird geschrieben. Vorhandene Zieldatei nur mit `UEBERSCHREIBEN=ja` überschreiben — vorher rückfragen.

**Immer erst ins Scratchpad rendern und ansehen, dann auf den Vault-Pfad bauen.** Der Vault liegt unter `/Users/dennis/Tafelbilder`.
