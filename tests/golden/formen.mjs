// Deckt alle Elementtypen und alle sieben Farbrollen ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const f = s.frame("Formen und Rollen");
f.text("Alle Formen", { typo: "frametitel", x: 60, y: 50 });
f.box("Neutral", { rolle: "neutral", typo: "kernbegriff", x: 80, y: 250 });
f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 480, y: 250 });
f.box("Kontra", { rolle: "kontra", typo: "kernbegriff", x: 880, y: 250 });
f.ellipse("Ergebnis", { rolle: "ergebnis", typo: "kernbegriff", x: 80, y: 520 });
f.diamond("Frage", { rolle: "frage", typo: "kernbegriff", x: 640, y: 520 });
f.box("Kontext", { rolle: "kontext", typo: "detail", x: 1200, y: 250 });
f.box("Technik", { rolle: "technik", typo: "standard", x: 1200, y: 520 });
export default s;
