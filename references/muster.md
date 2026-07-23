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
| **Tabelle zum Ausfüllen** | pro Spalte ein Kopf-Kasten (`rolle: "frage"`) + `column(frame, stichworte, { abstand: "weit" })` darunter | Stichworte vorgeben, Leerraum zum Handschriftlichen (Schüler füllen selbst) |
| **These – Antithese – Synthese** | drei Kästen (`kern` / `kontra` / `ergebnis`), mit `connect` verbunden | dialektische Figur |
| **Schichtenmodell** | `column(frame, schichten, { abstand: "eng" })` | aufeinander aufbauende Ebenen |
| **Zwei Stämme auf ein Zentrum** | drei Kästen von Hand platziert (links / Mitte / rechts), zwei `connect` aufs Zentrum mit Label | „X und Y ergeben Z" (z. B. Sinnlichkeit + Verstand → Erkenntnis) |

## Grundsätze

- **Ein Zentrum je Frame.** Der wichtigste Begriff bekommt `rolle: "kern"` und die prominenteste Größe; alles andere ordnet sich unter.
- **Frame-Titel immer als eigener `frametitel`-Text**, nicht nur als Frame-Name — sonst fehlt die aus der Distanz lesbare Überschrift.
- **Platz zum Weiterschreiben lassen.** Es sind Tafelbilder; Dennis ergänzt live per Stift. Lieber luftig als vollgestopft — großzügige Abstände, freie Flächen.
- **Farbe ist Betonung, nicht Dekoration.** Siehe `references/hausstil.md`.

## Noch nicht baubar

Mengenkreise (Venn), Dreiecke (z. B. Gewaltdreieck), Programmablaufpläne, sichtbare Trennlinien und Tabellenrahmen, eingebettete Bilder, klickbare Notiz-Links, Transklusionen. Wenn ein Board das braucht, ehrlich sagen — nicht behelfsmäßig mit falschen Primitiven nachbauen.
