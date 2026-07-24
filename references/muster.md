# Kompositionsmuster

Welcher Diagrammtyp mit welchem Werkzeug. Muster lassen sich in einem Frame kombinieren.

## Auf Board-Ebene

- **Wandzeitung** — mehrere Frames nebeneinander als Zoom-Bereiche. Kein `sequence`, nur räumliche Bereiche. Aus der Distanz die Gliederung (Frame-Titel), beim Hineinzoomen das Detail. Für ein Thema mit klar getrennten Aspekten. *So war das Kant-Board gebaut: ein Bereich Einordnung, ein Bereich Tabelle.*
- **Präsentationsablauf** — Kapitel-Frames mit `s.sequence(...)` durch nummerierte Übergänge verkettet. Jeder Frame hat seine eigene innere Logik. Für den Stundenverlauf: Einstieg → Erarbeitung → Sicherung.

## Auf Frame-Ebene

| Muster | Werkzeug | Wofür |
|---|---|---|
| **Mindmap / Radial** | `radial(frame, zentrum, satelliten, { radius })` + `connect` vom Zentrum zu jedem Satelliten | Zentralbegriff und seine Aspekte |
| **Prozesskette** | `timeline(frame, schritte, { szene })` | Ablauf, Schritt für Schritt mit Pfeilen |
| **Zeitstrahl** | `row(frame, stationen, { abstand: "weit" })`, optional mit `connect` | zeitliche Abfolge |
| **Vierfelder-Matrix** | `grid(frame, felder, { spalten: 2 })` | Gegenüberstellung entlang zweier Achsen |
| **Tabelle zum Ausfüllen** | `tabelle(frame, kopf, { zeilen })` — Spaltenköpfe + leere Zeilen mit Spalten-Trennlinien | Stichworte vorgeben, Leerraum zum Handschriftlichen |
| **These – Antithese – Synthese** | drei Kästen (`kern` / `kontra` / `ergebnis`), mit `connect` verbunden | dialektische Figur |
| **Schichtenmodell** | `column(frame, schichten, { abstand: "eng" })` | aufeinander aufbauende Ebenen |
| **Zwei Stämme auf ein Zentrum** | drei Kästen von Hand platziert (links / Mitte / rechts), zwei `connect` aufs Zentrum mit Label | „X und Y ergeben Z" (z. B. Sinnlichkeit + Verstand → Erkenntnis) |
| **Dreieck / Gewaltdreieck** | `dreieck(frame, [oben, links, rechts], { breite })` | drei Pole/Begriffe an den Ecken (z. B. Galtung) |

## Grundsätze

- **Ein Zentrum je Frame.** Der wichtigste Begriff bekommt `rolle: "kern"` und die prominenteste Größe; alles andere ordnet sich unter.
- **Frame-Titel immer als eigener `frametitel`-Text**, nicht nur als Frame-Name — sonst fehlt die aus der Distanz lesbare Überschrift.
- **Platz zum Weiterschreiben lassen.** Es sind Tafelbilder; Dennis ergänzt live per Stift. Lieber luftig als vollgestopft — großzügige Abstände, freie Flächen.
- **Farbe ist Betonung, nicht Dekoration.** Siehe `references/hausstil.md`.

## Obsidian-Anbindung

Ein Board kann an den Vault binden (Details und Signaturen in `references/builder-api.md`):

- **Notiz-Link** an einer Form: `f.box("…", { link: "[[Notiz]]" })` — in Obsidian anklickbar. Gut, um einen Begriff auf die vertiefende Notiz zu führen.
- **Eingebettetes Bild**: `f.image("Anhänge/bild.png", { breite })` — das Bild muss schon im Vault liegen. Für Anschauungsmaterial (Foto, Grafik, gescanntes Schaubild).
- **Transklusion**: `f.transclusion("[[Notiz#Abschnitt]]", { breite })` — zieht einen Notiz-Abschnitt ins Board. Eigenen Raum geben (die Höhe ist erst ein Platzhalter).

## Noch nicht baubar

Mengenkreise (Venn), Programmablaufpläne. Wenn ein Board das braucht, ehrlich sagen — nicht behelfsmäßig mit falschen Primitiven nachbauen.
