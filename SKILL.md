---
name: excalidraw-tafelbild
description: Use when Dennis will ein Excalidraw-Tafelbild, Schaubild, Diagramm, eine Mindmap, eine Wandzeitung oder einen Präsentationsablauf für seinen Obsidian-Vault erstellen oder ein bestehendes Board überarbeiten — auch wenn er nur eine Unterrichtsstunde, ein Thema oder ein „Tafelbild dazu" nennt.
---

# Excalidraw-Tafelbild bauen

Erzeugt gültige `.excalidraw.md`-Boards für Dennis' Obsidian-Vault mit einer geprüften Node-Bibliothek unter `/Users/dennis/Projekte/Skill_Excalidraw_erstellen`. Die Bibliothek misst Text exakt, bindet Pfeile korrekt, prüft die Szene und **rendert sie mit Excalidraws echter Engine**, damit das Layout vor der Auslieferung sichtbar ist.

**Kernprinzip:** Nicht raten, sondern sehen. Ein Board wird gebaut, gerendert, **angesehen**, korrigiert — und erst dann in den Vault geschrieben. Der Validator fängt strukturelle Fehler; Überlappungen und schlechtes Layout fängt nur das Auge.

## Der Ablauf — in dieser Reihenfolge, ohne Auslassung

1. **Struktur-Gate zuerst.** Bevor irgendetwas gebaut wird: Dennis eine **Textgliederung** vorlegen — Zentralbegriff, die Bausteine, die Beziehungen, und ob es *ein Board* (eine Fläche zum Hineinzoomen) oder ein *Präsentationsablauf* (Kapitel-Frames mit nummerierten Übergängen) wird. **Auf seine Freigabe warten.** Nie ungefragt drauflosbauen — Dennis will die inhaltliche Struktur absegnen, bevor gezeichnet wird.
2. **Szenen-Skript schreiben** — ein kurzes `.mjs` im Scratchpad (nicht im Repo, nicht im Vault), das die Builder-API aufruft. Siehe `references/builder-api.md` für die Funktionen, `references/hausstil.md` für Rollen/Größen, `references/muster.md` für die Anordnung.
3. **Bauen, validieren, rendern** ins Scratchpad:
   ```bash
   node bin/build.mjs <skript.mjs> <scratchpad/vorschau.excalidraw.md> --renders <scratchpad/renders>
   ```
   Harte Fehler brechen hier ab — dann das Skript korrigieren. **Warnungen (besonders `ueberlappung`) sind ein Auftrag, genauer hinzusehen, kein Grund weiterzumachen.**
4. **Jeden Frame ansehen.** Die erzeugten PNGs mit dem `Read`-Tool öffnen — Übersicht *und* jeden einzelnen Frame. Prüfen: Überlappt nichts? Läuft kein Text aus seinem Kasten? Verbinden Pfeile die richtigen Formen? Sind Umlaute korrekt? Passt die Farbwahl zur Bedeutung? **Wenn etwas nicht stimmt, das Skript ändern und ab Schritt 3 wiederholen** — nicht das kaputte Board ausliefern.
5. **Erst jetzt in den Vault** — mit demselben Skript auf den Zielpfad unter `/Users/dennis/Tafelbilder`. Kein stilles Überschreiben: existiert die Datei, `UEBERSCHREIBEN=ja` nur nach Rückfrage.
6. **Dennis öffnet es in Obsidian.** Ihm Pfad und kurze Beschreibung nennen, und um Rückmeldung zu Beameralltag, Zoom und Weiterschreiben bitten — das kann nur er beurteilen.

## Entscheidungsregeln

- **Ein Board oder ein Ablauf?** Frag beim Struktur-Gate. *Ein Board* = eine Fläche (ein oder mehrere nebeneinanderliegende Frames als Zoom-Bereiche), Prezi-artig. *Ablauf* = Kapitel-Frames, mit `s.sequence(...)` durch nummerierte Übergänge verkettet, für den Stundenverlauf. Im Zweifel: ein Board.
- **Welche Anordnung?** `references/muster.md` ordnet Diagrammtyp → Layout-Helfer zu (Mindmap → `radial`, Prozesskette → `timeline`, Vierfelder → `grid`, Reihe/Spalte → `row`/`column`).
- **Was der Skill (noch) nicht kann:** klickbare Notiz-Links, eingebettete Bilder, Transklusionen, Mengenkreise, Dreiecke, Programmablaufpläne, reine Trennlinien/Tabellenrahmen. Wenn Dennis das braucht, sag es ehrlich, statt es zu behelfsmäßig nachzubauen.

## Red Flags — STOP

- „Der Validator meldet keine harten Fehler, also ist es fertig." → Nein. **Ansehen.** Überlappung ist nur eine Warnung.
- „Ich baue schnell drauflos, die Struktur ergibt sich." → Nein. **Struktur-Gate zuerst**, Freigabe abwarten.
- „Das Rendering sieht wohl okay aus." → Nur wenn du es **tatsächlich mit dem Read-Tool geöffnet** hast. Jeden Frame.
- „Ich schreibe direkt in den Vault und schaue danach." → Nein. **Vault zuletzt**, nach dem visuellen Check.
- Ein `radial`/Layout mit engem Radius und langen Texten → wahrscheinlich Überlappung. Radius großzügig wählen und im Rendering prüfen.

## Vorbereitung

Einmalig prüfen, dass die Umgebung steht: `node bin/doctor.mjs` (Node ≥ 20, Vault, Schriften, Plugin). Fehlt das Renderer-Bündel, `npm run build-renderer`. Details in `references/builder-api.md`.

## Referenzen

- `references/builder-api.md` — die Builder-API: `scene`, `frame`, `box`/`ellipse`/`diamond`/`text`, `connect`, Layout-Helfer, `sequence`, die Kommandozeilen.
- `references/hausstil.md` — Farbrollen, Typo-Skala, Zoom-Ebenen, Abstände.
- `references/muster.md` — Kompositionsmuster: welcher Diagrammtyp mit welchem Helfer.
