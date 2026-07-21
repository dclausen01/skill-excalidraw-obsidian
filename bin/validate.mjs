import fs from "node:fs";
import { validateScene, formatFindings } from "../lib/validate/index.js";
import { markdownToScene } from "../lib/document.js";
import { zoomL0 } from "../lib/style.js";

const [dateiPfad] = process.argv.slice(2);

if (!dateiPfad) {
  console.error("Aufruf: node bin/validate.mjs <datei.excalidraw.md>");
  process.exit(1);
}

const markdown = fs.readFileSync(dateiPfad, "utf8");
const { elements } = markdownToScene(markdown);

// Boardmaße aus den Elementen selbst, damit die L0-Regel auch für fremde Dateien greift.
const rechts = Math.max(...elements.map((e) => e.x + e.width));
const unten = Math.max(...elements.map((e) => e.y + e.height));
const links = Math.min(...elements.map((e) => e.x));
const oben = Math.min(...elements.map((e) => e.y));

const ergebnis = validateScene(elements, {
  markdown,
  zoomL0: zoomL0(rechts - links, unten - oben),
});

// Scope-Hinweis zuerst, plain und kurz: ein Nutzer, der eines seiner eigenen
// älteren Boards prüft, sieht sonst nur "33 Fehler: ... arrow ..." und schließt
// zu Recht auf ein kaputtes Board — dabei ist das Board nur nicht von diesem
// Skill erzeugt (freedraw, Bilder, Pfeile, Virgil-Schrift usw. sind normale
// Excalidraw-Merkmale, die dieser Skill nur selbst nie erzeugt). Siehe
// Fix-Durchgang 1, Task-7-Report, Finding 1.
if (ergebnis.ausserhalbDesSkills) {
  const { fremdeTypen, fremdeSchriften } = ergebnis.ausserhalbDesSkills;
  const teile = [];
  if (fremdeTypen.length > 0) teile.push(`Elementtypen ${fremdeTypen.join(", ")}`);
  if (fremdeSchriften.length > 0) teile.push(`Schriften ${fremdeSchriften.join(", ")}`);
  console.log(
    `Hinweis: Diese Datei nutzt ${teile.join(" und ")} — das erzeugt dieser Skill nicht selbst.\n` +
      "Die Datei stammt also nicht aus diesem Skill; die folgenden Befunde sind dafür erwartbar\n" +
      "und keine Aussage über einen Defekt.\n",
  );
}

console.log(formatFindings(ergebnis.findings));

// Exit-Code: 0 = gültig, 1 = harter Fehler in einer Datei, die dieser Skill
// erzeugt haben könnte (also ein echter Befund), 2 = außerhalb des Prüfumfangs.
// Getrennt von 1, weil "kann ich nicht beurteilen" etwas anderes ist als "ist
// kaputt" — Automatisierung, die den Exit-Code auswertet (z. B. vor dem
// Schreiben in den Vault), soll diese Datei überspringen statt sie wie einen
// eigenen defekten Output zu behandeln. ok bleibt dabei praktisch immer false
// für fremde Dateien (checkSchema meldet jeden fremden Typ/jede fremde Schrift
// als Fehler), ist hier also kein brauchbares Unterscheidungsmerkmal — die
// Fallunterscheidung muss auf ausserhalbDesSkills selbst prüfen.
if (ergebnis.ausserhalbDesSkills) {
  console.log("\nAußerhalb des Prüfumfangs — von diesem Skill nicht erzeugt.");
  process.exit(2);
}

console.log(ergebnis.ok ? "\nGültig." : "\nUngültig — harte Fehler vorhanden.");
process.exit(ergebnis.ok ? 0 : 1);
