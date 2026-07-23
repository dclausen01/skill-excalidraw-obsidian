// Deckt ein eingebettetes Bild und einen Notiz-Link ab. Neutrales Testbild
// (tests/fixtures/testbild.png), nie ein Vault-Bild (Datenschutz, Spec 2.5.1).
import path from "node:path";
import { scene } from "../../lib/scene.js";
import { PROJECT_ROOT } from "../../lib/config.js";

const s = scene();
const f = s.frame("Bild und Link");
f.text("Anschauungsmaterial", { typo: "frametitel", x: 60, y: 55 });
f.box("Zur Vertiefung", { rolle: "kern", typo: "kernbegriff", x: 120, y: 300, link: "[[Vertiefungsnotiz]]" });
f.image(path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png"), { x: 700, y: 300, breite: 300 });

export default s;
