# Hausstil

Die Werte sind in `lib/style.js` verankert; hier stehen sie zum Nachschlagen beim Bauen.

## Farbrollen

Ein Kasten bekommt eine **Rolle** (`rolle: "…"`), keine rohe Farbe. Die Rolle trägt Bedeutung — konsistent eingesetzt liest sich ein Board von selbst.

| Rolle | Wirkung | Wofür |
|---|---|---|
| `neutral` | weiß, schwarzer Strich | Standardbox, Struktur, neutrale Bausteine |
| `kern` | blau | Kernbegriff, zentrale These, das Wichtigste |
| `kontra` | rot | Gegenposition, Kritik, Einwand |
| `ergebnis` | grün | Fazit, Lösung, Merksatz |
| `frage` | orange/gelb | Leitfrage, Arbeitsauftrag, Titel einer Tabelle |
| `kontext` | grau | Quelle, Randnotiz, Nebeninformation |
| `technik` | violett | Code, Algorithmus, technischer Ablauf |

**Faustregel:** Ein Board hat *einen* `kern` (das Zentrum), sparsam `kontra`/`ergebnis` für die Zuspitzung, den Rest `neutral`/`kontext`. Nicht jede Box einfärben — Farbe ist Betonung.

## Typo-Skala

Die **Zielstufe** (`typo: "…"`) bestimmt Größe und Schrift. Größe wächst mit der Wichtigkeit, nicht mit der Laune.

| typo | Größe | Schrift | Zielstufe | Wofür |
|---|---|---|---|---|
| `boardtitel` | 120 | Excalifont | L0 | Titel des ganzen Boards (selten) |
| `frametitel` | 72 | Excalifont | L0 | Überschrift eines Frames — aus der Distanz lesbar |
| `kernbegriff` | 36 | Excalifont | L1 | Begriffe in Kästen, handgezeichneter Charakter |
| `standard` | 24 | Nunito | L1 | Fließtext, Beschriftungen |
| `detail` | 18 | Nunito | L1 | Kleingedrucktes, Tabellen-Stichworte |
| `fussnote` | 14 | Nunito | L2 | Quellenangabe, nur beim Hineinzoomen lesbar |

Excalifont ist handgezeichnet (Tafelcharakter, für Titel und Begriffe), Nunito serifenlos (Lesbarkeit in der Fläche, für Fließtext).

**Lesbarkeitsregel:** Ein Text ist auf einer Zoomstufe lesbar, wenn `Größe × Zoomfaktor ≥ 18`. Auf L1 (ein Frame füllt den Beamer) ist der Zoomfaktor 1,0 — alles ab 18 ist lesbar. Der Validator warnt, wenn ein Text darunterfällt.

## Zoom-Ebenen — das „Wandzeitung"-Modell

Ein **Kapitel-Frame ist 1920 × 1080 Einheiten** (Beamer-Format). Daraus folgt:

- **L1 Kapitel** — ein Frame füllt den Beamer, eine Einheit = ein Pixel. Hier wird gearbeitet.
- **L0 Übersicht** — das ganze Board (alle Frames) auf einem Bildschirm. Nur Frame-Titel (72) und Board-Titel (120) bleiben lesbar; alles andere wird zu Struktur-Textur. Das ist der Prezi-Effekt: aus der Distanz die Gliederung, beim Hineinzoomen das Detail.
- **L2 Detail** — in eine Ecke gezoomt, alles lesbar.

Frames werden automatisch nebeneinander gesetzt (240 Einheiten Abstand). Innerhalb eines Frames sind die Koordinaten **frame-relativ** (0…1920 × 0…1080).

## Abstände

Layout-Helfer nehmen einen Abstands-Token, keinen Pixelwert:

| Token | Einheiten | Wofür |
|---|---|---|
| `eng` | 40 | innerhalb einer Gruppe |
| `normal` | 80 | zwischen Gruppen (Standard) |
| `weit` | 160 | großzügig, z. B. Tabellenzeilen mit Platz zum Ausfüllen |

Zwischen Frames liegen fest 240 Einheiten.
