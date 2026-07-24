// Gewaltdreieck, nur Umriss: deckt dreieck (geschlossene line) + Ecken-Labels ab.
import { scene } from "../../lib/scene.js";
import { dreieck } from "../../lib/shapes/dreieck.js";

const s = scene();
const f = s.frame("Gewaltdreieck");
f.text("Das Gewaltdreieck nach Galtung", { typo: "frametitel", x: 60, y: 55 });
dreieck(f, ["personelle Gewalt", "strukturelle Gewalt", "kulturelle Gewalt"],
  { x: 560, y: 320, breite: 800 });

export default s;
