import fs from "node:fs";
import { validateScene, formatFindings } from "../lib/validate/index.js";
import { markdownToScene } from "../lib/document.js";
import { zoomL0 } from "../lib/style.js";

const USAGE = `Aufruf: node bin/validate.mjs <datei.excalidraw.md>

Exit-Codes:
  0  gültig — keine harten Fehler
  1  harte Fehler in einer Datei, die dieser Skill erzeugt haben könnte
  2  außerhalb des Prüfumfangs — nutzt Elementtypen/Schriften/Felder, die dieser Skill nicht erzeugt
  3  Datei konnte nicht gelesen oder geparst werden (fehlt, kein Excalidraw-Inhalt, kaputtes compressed-json)`;

const [dateiPfad] = process.argv.slice(2);

if (!dateiPfad) {
  console.error(USAGE);
  process.exit(1);
}

// Lese-/Parsefehler (Datei fehlt, ist keine Excalidraw-Datei, oder ihr
// compressed-json-Block lässt sich nicht dekomprimieren) sind etwas anderes als
// ein harter Befund über eine tatsächlich geöffnete Szene — Automatisierung, die
// vor dem Schreiben in den Vault validiert, muss "ich konnte die Datei nicht
// öffnen" von "die Datei ist inhaltlich kaputt" unterscheiden können. Deshalb ein
// eigener Exit-Code (3), nicht der für harte Befunde reservierte (1), und eine
// kurze Meldung ohne Node-Stacktrace (Schlussprüfung, Finding B).
let markdown, elements;
try {
  markdown = fs.readFileSync(dateiPfad, "utf8");
  ({ elements } = markdownToScene(markdown));
} catch (fehler) {
  console.error(`Datei konnte nicht gelesen oder geparst werden: ${fehler.message}`);
  process.exit(3);
}

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
  const { fremdeTypen, fremdeSchriften, fehlendeKonventionsfelder } = ergebnis.ausserhalbDesSkills;
  const nutzt = [];
  if (fremdeTypen.length > 0) nutzt.push(`Elementtypen ${fremdeTypen.join(", ")}`);
  if (fremdeSchriften.length > 0) nutzt.push(`Schriften ${fremdeSchriften.join(", ")}`);

  // Zwei unabhängige, für sich vollständige Sätze statt einer gemeinsam
  // zusammengesetzten Aufzählung — Elementtyp/Schrift ("nutzt X") und fehlende
  // Konventionsfelder ("es fehlen Y") haben unterschiedliche Subjekte/Verben und
  // lassen sich nicht grammatisch sauber zu einer Aufzählung verbinden.
  const saetze = [];
  if (nutzt.length > 0) saetze.push(`Diese Datei nutzt ${nutzt.join(" und ")}, die dieser Skill nicht erzeugt.`);
  if (fehlendeKonventionsfelder.length > 0) {
    saetze.push(`Es fehlen Felder wie ${fehlendeKonventionsfelder.join(", ")}, die dieser Skill beim Erzeugen immer setzt.`);
  }

  console.log(
    `Hinweis: ${saetze.join(" ")}\n` +
      "Die Datei stammt also nicht aus diesem Skill; die folgenden Befunde sind dafür erwartbar\n" +
      "und keine Aussage über einen Defekt.\n",
  );
}

console.log(formatFindings(ergebnis.findings));

// Exit-Code: 0 = gültig, 1 = harter Fehler in einer Datei, die dieser Skill
// erzeugt haben könnte (also ein echter Befund), 2 = außerhalb des Prüfumfangs,
// 3 = Datei nicht lesbar/parsebar (siehe USAGE oben). Getrennt von 1, weil
// "kann ich nicht beurteilen" etwas anderes ist als "ist kaputt" —
// Automatisierung, die den Exit-Code auswertet (z. B. vor dem Schreiben in den
// Vault), soll diese Datei überspringen statt sie wie einen eigenen defekten
// Output zu behandeln. ok ist hier bewusst KEIN brauchbares Unterscheidungs-
// merkmal: für fremde Typen/Schriften bleibt es zwar meist false (checkSchema
// meldet die weiterhin als Fehler), aber seit die fünf Konventionsfelder
// (Schlussprüfung, Finding C) nur noch Warnungen auslösen, kann eine Datei,
// die AUSSCHLIESSLICH über fehlende Konventionsfelder als fremd erkannt wird,
// durchaus ok === true tragen. Die Fallunterscheidung muss deshalb immer auf
// ausserhalbDesSkills selbst prüfen, nie auf ok.
if (ergebnis.ausserhalbDesSkills) {
  console.log("\nAußerhalb des Prüfumfangs — von diesem Skill nicht erzeugt.");
  process.exit(2);
}

console.log(ergebnis.ok ? "\nGültig." : "\nUngültig — harte Fehler vorhanden.");
process.exit(ergebnis.ok ? 0 : 1);
