// Deckt deutsche Sonderzeichen und mehrzeiligen, umbrochenen Text ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const f = s.frame("Umlaute und Umbruch");
f.text("Mängelwesen, Größe, Überfluß", { typo: "frametitel", x: 60, y: 50 });
f.box("Der Mensch ist ein Mängelwesen und muss die fehlende Instinktausstattung durch Kultur ausgleichen.", {
  rolle: "kern", typo: "standard", x: 120, y: 300, breite: 700,
});
f.box("§ 3 Abs. 2", { rolle: "kontext", typo: "detail", x: 1000, y: 300 });
export default s;
