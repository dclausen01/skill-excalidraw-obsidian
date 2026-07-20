// scripts/sync-fonts.mjs
import fs from "node:fs";
import path from "node:path";
import { FONT_DIR, PROJECT_ROOT } from "../lib/config.js";

const QUELLE = path.join(PROJECT_ROOT, "node_modules", "@excalidraw", "excalidraw", "dist", "prod", "fonts");
const FAMILIEN = ["Excalifont", "Nunito"];

fs.mkdirSync(FONT_DIR, { recursive: true });

// Alte Subsets zuerst entfernen: sonst behält ein Versions-Upgrade (neue Datei-Hashes)
// die alten Dateien bei, und die Überlappungsfläche zwischen Subsets wüchse mit jedem
// sync-fonts-Lauf statt sich zu ersetzen.
for (const familie of FAMILIEN) {
  for (const datei of fs.readdirSync(FONT_DIR).filter((f) => f.startsWith(`${familie}__`) && f.endsWith(".woff2"))) {
    fs.rmSync(path.join(FONT_DIR, datei));
  }
}

let kopiert = 0;

for (const familie of FAMILIEN) {
  const von = path.join(QUELLE, familie);
  if (!fs.existsSync(von)) throw new Error(`Schriftquelle fehlt: ${von} — npm i ausführen`);

  for (const datei of fs.readdirSync(von).filter((f) => f.endsWith(".woff2"))) {
    fs.copyFileSync(path.join(von, datei), path.join(FONT_DIR, `${familie}__${datei}`));
    kopiert++;
  }
}

console.log(`${kopiert} Schrift-Subsets nach ${FONT_DIR} kopiert.`);
