// tests/document-links.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown, markdownToScene } from "../lib/document.js";

function baue() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, link: "[[Mängelwesen]]" });
  f.box("Ohne", { rolle: "neutral", typo: "kernbegriff", x: 100, y: 400 });
  return s;
}

describe("## Element Links", () => {
  const md = sceneToMarkdown(baue(), { pluginVersion: "2.23.12" });

  it("schreibt die Sektion mit dem verlinkten Element", () => {
    expect(md).toContain("## Element Links");
    expect(md).toMatch(/^[A-Za-z0-9]{8}: \[\[Mängelwesen\]\]$/m);
  });

  it("nennt nur verlinkte Elemente", () => {
    const zeilen = md.split("\n").filter((z) => /^[A-Za-z0-9]{8}: \[\[/.test(z));
    expect(zeilen).toHaveLength(1);
  });

  it("lässt die Sektion weg, wenn kein Link existiert", () => {
    const s = scene();
    const f = s.frame("K");
    f.box("X", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    expect(sceneToMarkdown(s, { pluginVersion: "2.23.12" })).not.toContain("## Element Links");
  });

  it("round-trippt: markdownToScene liest den Link zurück", () => {
    const gelesen = markdownToScene(md);
    const linkWerte = Object.values(gelesen.sektionen.elementLinks);
    expect(linkWerte).toContain("[[Mängelwesen]]");
  });
});
