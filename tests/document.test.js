import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { scene } from "../lib/scene.js";
import { loadFontRegistry } from "../lib/fonts.js";
import { sceneToMarkdown, markdownToScene } from "../lib/document.js";
import { VAULT_PATH } from "../lib/config.js";

// Einmal laden und an alle scene()-Aufrufe reichen — Schriftregistrierung ist
// teuer und soll in Tests nicht pro scene() neu aufgebaut werden.
const registry = loadFontRegistry();

function beispiel() {
  const s = scene({ registry });
  const f = s.frame("Kapitel 1");
  f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  return s;
}

describe("sceneToMarkdown", () => {
  const md = sceneToMarkdown(beispiel(), { pluginVersion: "2.23.12" });

  it("beginnt mit dem erwarteten Frontmatter", () => {
    expect(md.startsWith("---\nexcalidraw-plugin: parsed\n")).toBe(true);
    expect(md).toContain("tags:\n  - excalidraw");
  });

  it("enthält den Warnhinweis für die Leseansicht", () => {
    expect(md).toContain("Switch to EXCALIDRAW VIEW");
  });

  it("spiegelt jedes Textelement mit Blockreferenz", () => {
    expect(md).toMatch(/^Mängelwesen \^[A-Za-z0-9]{8}$/m);
  });

  it("versteckt den Drawing-Block hinter %%", () => {
    const drawingPos = md.indexOf("## Drawing");
    const kommentarPos = md.indexOf("%%");
    expect(kommentarPos).toBeGreaterThan(-1);
    expect(kommentarPos).toBeLessThan(drawingPos);
  });

  it("schreibt unkomprimiertes JSON mit der Plugin-Version", () => {
    expect(md).toContain("```json");
    expect(md).not.toContain("compressed-json");
    const json = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1]);
    expect(json.type).toBe("excalidraw");
    expect(json.source).toContain("2.23.12");
    expect(json.files).toEqual({});
  });

  it("lässt leere Sektionen weg", () => {
    expect(md).not.toContain("## Element Links");
    expect(md).not.toContain("## Embedded Files");
  });

  it("ist deterministisch", () => {
    expect(sceneToMarkdown(beispiel(), { pluginVersion: "2.23.12" }))
      .toBe(sceneToMarkdown(beispiel(), { pluginVersion: "2.23.12" }));
  });

  it("hat denselben Header wie eine echte Vault-Datei — kein Leerzeilen-Drift", () => {
    // Frontmatter, Warnhinweis und die Zeilen bis '## Text Elements' sind
    // fixer, szenenunabhängiger Text. Ein Byte-für-Byte-Vergleich der ersten
    // 12 Zeilen gegen eine reale, vom Plugin selbst geschriebene Datei deckt
    // jeden Leerzeilen-Drift auf — nicht nur den zwischen '---' und dem
    // Warnhinweis.
    const referenz = fs.readFileSync(
      path.join(VAULT_PATH, "FoBi Nextcloud + EuroOffice.excalidraw.md"),
      "utf8",
    );
    const erwartet = referenz.split("\n").slice(0, 12).join("\n");
    const tatsaechlich = md.split("\n").slice(0, 12).join("\n");
    expect(tatsaechlich).toBe(erwartet);
  });

  it("übersteht den eigenen Rundlauf: sceneToMarkdown → markdownToScene liefert dieselben Elemente", () => {
    const s = scene({ registry });
    const f = s.frame("Kapitel 1");
    f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.text("Freistehender Text", { typo: "standard", x: 10, y: 10 });

    const markdown = sceneToMarkdown(s, { pluginVersion: "2.23.12" });
    const original = s.elements();
    const gelesen = markdownToScene(markdown);

    expect(gelesen.elements).toEqual(original);

    const textIds = original.filter((e) => e.type === "text").map((e) => e.id);
    expect(textIds.length).toBeGreaterThan(0);
    for (const id of textIds) {
      expect(gelesen.sektionen.textElemente).toContain(id);
    }
  });
});

describe("markdownToScene — Sektionen bleiben auf ihre Überschrift beschränkt", () => {
  // Obsidians Blockreferenz-Syntax ist "^" + 8 alphanumerische Zeichen — exakt das
  // Muster, das der Textindex-Parser sucht. Ein Textelement, das selbst über
  // Blockreferenzen spricht (naheliegend, wenn der Nutzer Obsidian unterrichtet),
  // darf keinen Phantom-Indexeintrag erzeugen, nur weil sein Inhalt zufällig auf
  // derselben Zeilenform endet wie ein echter Indexeintrag.
  it("liest keinen Phantom-Indexeintrag aus einer Blockreferenz im Textinhalt", () => {
    const s = scene({ registry });
    const f = s.frame("Kapitel 1");
    f.text("See issue ^abc12345\nSecond line here", { typo: "standard", x: 10, y: 10 });

    const markdown = sceneToMarkdown(s, { pluginVersion: "2.23.12" });
    const gelesen = markdownToScene(markdown);

    const echteId = s.elements().find((e) => e.type === "text").id;
    expect(gelesen.sektionen.textElemente).toEqual([echteId]);
    expect(gelesen.sektionen.textElemente).not.toContain("abc12345");
  });

  it("liest keinen Phantom-Element-Link aus Textinhalt, der wie ein Link-Eintrag aussieht", () => {
    // Die "^id"-Markierung hängt sich beim Schreiben an die LETZTE Zeile des
    // Blocks — deshalb braucht es eine dritte Zeile danach, damit die
    // verdächtige Zeile "AbCd1234: [[...]]" unverändert (mit Zeilenende)
    // erhalten bleibt, wie es echter mehrzeiliger Inhalt tut.
    const s = scene({ registry });
    const f = s.frame("Kapitel 1");
    f.text("Siehe Referenz:\nAbCd1234: [[Andere Notiz]]\nEnde", { typo: "standard", x: 10, y: 10 });

    const markdown = sceneToMarkdown(s, { pluginVersion: "2.23.12" });
    // Ohne echte "## Element Links"-Sektion darf gar kein Eintrag entstehen —
    // auch nicht aus einer Zeile im Textinhalt, die zufällig wie ein
    // Link-Eintrag ("XXXXXXXX: [[...]]") aussieht.
    expect(markdown).not.toContain("## Element Links");
    const gelesen = markdownToScene(markdown);
    expect(gelesen.sektionen.elementLinks).toEqual({});
  });

  it("liest keinen Phantom-Embedded-File-Eintrag aus Textinhalt, der wie ein Datei-Eintrag aussieht", () => {
    const s = scene({ registry });
    const f = s.frame("Kapitel 1");
    const hash = "0123456789012345678901234567890123456789"; // 40 Hex-Ziffern
    f.text(`Hash-Beispiel:\n${hash}: [[bild.png]]\nEnde`, { typo: "standard", x: 10, y: 10 });

    const markdown = sceneToMarkdown(s, { pluginVersion: "2.23.12" });
    expect(markdown).not.toContain("## Embedded Files");
    const gelesen = markdownToScene(markdown);
    expect(gelesen.sektionen.embeddedFiles).toEqual({});
  });

  it("findet den echten Indexeintrag auch wenn eine Leerzeile mitten im Textelement steht", () => {
    // Reproduktion Fall 1: letzteZeilenProBlock() splittet die Sektion auf
    // /\n{2,}/ — genau das Trennmuster, das sceneToMarkdown selbst zwischen
    // Blöcken einsetzt. Ein rawText mit eingebautem Absatzumbruch ("...^abc12345\n\nSo
    // verweist man...") erzeugt zufällig dieselbe Doppel-Leerzeile *innerhalb*
    // eines einzigen Blocks und wird dadurch fälschlich in zwei Blöcke zerlegt.
    // Die eigentliche letzte Zeile (mit der echten "^id") geht dabei verloren.
    const s = scene({ registry });
    const f = s.frame("Kapitel 1");
    f.text("Referenz-Beispiel ^abc12345\n\nSo verweist man auf einen Block.", {
      typo: "standard",
      x: 10,
      y: 10,
    });

    const markdown = sceneToMarkdown(s, { pluginVersion: "2.23.12" });
    const gelesen = markdownToScene(markdown);

    const echteId = s.elements().find((e) => e.type === "text").id;
    expect(gelesen.sektionen.textElemente).toContain(echteId);
  });
});
