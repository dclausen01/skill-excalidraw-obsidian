// Deckt einen Präsentationsablauf über mehrere Frames ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const a = s.frame("Einstieg");
a.text("Was ist der Mensch?", { typo: "frametitel", x: 60, y: 60 });
const b = s.frame("These");
b.text("Der Mensch als Mängelwesen", { typo: "frametitel", x: 60, y: 60 });
const c = s.frame("Folgerung");
c.text("Kultur als Ausgleich", { typo: "frametitel", x: 60, y: 60 });

s.sequence([a, b, c], { nummeriert: true });

export default s;
