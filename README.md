# skill-excalidraw-obsidian

Ein [Claude-Code-Skill](https://docs.claude.com/en/docs/claude-code/skills) zum Erstellen
und Bearbeiten von Excalidraw-Tafelbildern in einem Obsidian-Vault — gedacht für
Unterrichtsmaterial, das als „Wandzeitung" mit mehreren Zoom-Ebenen funktioniert.

> **Status: Spezifikationsphase.** Das Design steht und ist abgenommen, die
> Implementierung hat noch nicht begonnen. Siehe
> [`docs/superpowers/specs/`](docs/superpowers/specs/).

## Wozu das gut ist

Excalidraw-Dateien sind JSON mit absoluten Koordinaten. Ein Sprachmodell kann sie
zwar schreiben, produziert dabei aber zuverlässig überlappende Kästen, Pfeile ins
Nichts und Text, der aus seinem Container läuft — weil es Textbreiten und
Pfeil-Ankerpunkte nur schätzt.

Dieser Skill dreht die Arbeitsteilung um:

- **Das Modell** entscheidet die Komposition — was gehört wohin, welche Beziehung ist
  wichtig, wie gliedert sich das Thema.
- **Eine Builder-Library** erledigt das Handwerk — Textmessung gegen die echten
  Schriftdateien, korrekte Bindings, Hausstil, Abstände.
- **Ein Validator und ein Renderer** prüfen das Ergebnis, *bevor* es im Vault landet.
  Der Renderer benutzt die echte Excalidraw-Engine in einem Headless-Browser und ist
  damit ein unabhängiger Zeuge, kein Echo der eigenen Annahmen.

## Kernentscheidungen

| Thema | Entscheidung |
|---|---|
| Layout | Bausteine + Komposition, kein Auto-Layout-Algorithmus |
| Zwischenschritt | Ein kurzes JS-Skript pro Board, kein eigenes DSL |
| Zoom-Modell | Ein Kapitel-Frame ist 1920 × 1080 Einheiten → Lesbarkeit wird rechenbar |
| Kontrolle | Struktur-Gate vor dem Zeichnen, Validator + Renderer danach |
| Ausgabe | Unkomprimiertes JSON in `.excalidraw.md`; das Plugin komprimiert selbst |
| Determinismus | `seed` aus dem Elementinhalt abgeleitet → identischer Input, identische Datei |

## Geplante Struktur

```
SKILL.md          Einstiegspunkt: Workflow und Entscheidungsregeln
references/       Dateiformat, Hausstil, API-Referenz, Musterkatalog
lib/              Builder: Stil, Textmessung, Elemente, Layout, Obsidian, Dokument
bin/              build · validate · render · read · doctor
assets/fonts/     Excalifont und Nunito für die Textmessung
tests/            Unit-, Roundtrip-, Golden-Render- und Integrationstests
```

## Musterkatalog

Wandzeitung · Präsentationsablauf · Mindmap/Radial · These–Antithese–Synthese ·
Zeitstrahl · Vierfelder-Matrix · Prozesskette · Schichtenmodell · Mengenkreise ·
Dreieck · Programmablaufplan (DIN 66001)

## Verifizierte Formatdetails

Das Dateiformat wurde an einem realen Vault (632 Boards, Plugin 2.23.12) überprüft
statt aus der Dokumentation übernommen. Die Ergebnisse stehen im Spec-Abschnitt
„Verifizierte Fakten zum Dateiformat" — unter anderem, dass `fontFamily: 5`
Excalifont und `6` Nunito bedeutet, dass Pfeil-Bindings das neuere
`fixedPoint`-Format verwenden und dass eingebettete Bilder über den SHA-1 ihrer
Bytes referenziert werden.

## Voraussetzungen

- Node.js ≥ 20
- Obsidian mit dem
  [Excalidraw-Plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) von
  zsviczian
- Chromium für den Renderer (wird von `bin/doctor.mjs` eingerichtet)

## Lizenz

MIT
