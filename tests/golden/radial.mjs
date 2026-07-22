// Deckt radiale Anordnung mit verbundenen Satelliten ab.
import { scene } from "../../lib/scene.js";
import { radial } from "../../lib/layout.js";

const s = scene();
const f = s.frame("Anthropologie");
f.text("Der Mensch als Mängelwesen", { typo: "frametitel", x: 60, y: 50 });

const { zentrum, satelliten } = radial(
  f, "Mängelwesen",
  ["Instinktarmut", "Weltoffenheit", "Kultur als 2. Natur", "Frühgeburt"],
  { rolle: "kern", typo: "kernbegriff", radius: 340, x: 960, y: 580 },
);
for (const sat of satelliten) s.connect(zentrum, sat);

export default s;
