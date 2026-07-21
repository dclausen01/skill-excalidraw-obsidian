import { ABSTAND } from "../style.js";

/** Überlappen sich zwei Rechtecke? Berührung zählt nicht. */
function ueberlappen(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width
      && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Liegt das Kind vollständig im Frame? */
function liegtInnerhalb(kind, frame) {
  return kind.x >= frame.x && kind.y >= frame.y
      && kind.x + kind.width <= frame.x + frame.width
      && kind.y + kind.height <= frame.y + frame.height;
}

/** Kleinster Abstand zwischen zwei Rechtecken; 0 bei Überlappung. */
function abstand(a, b) {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  return Math.sqrt(dx * dx + dy * dy);
}

export function checkGeometry(elemente, befunde) {
  const frames = elemente.filter((e) => e.type === "frame");
  const nachId = new Map(elemente.map((e) => [e.id, e]));

  // Frame-Abstand
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      const d = abstand(frames[i], frames[j]);
      if (d < ABSTAND.frames) {
        befunde.warn(
          "frameabstand",
          `Frames "${frames[i].name}" und "${frames[j].name}" stehen ${Math.round(d)} Einheiten auseinander, vorgesehen sind ${ABSTAND.frames}`,
          frames[i].id,
        );
      }
    }
  }

  // Gebundene Texte werden durchgehend übersprungen: Sie sitzen definitionsgemäß in
  // ihrem Container und folgen ihm. Würden sie mitgeprüft, erzeugte eine einzige
  // Überlappung zweier Kästen bis zu vier Meldungen (Kasten/Kasten, Kasten/Text,
  // Text/Kasten, Text/Text) — und dieselbe Ursache viermal zu melden macht die
  // Warnliste unbrauchbar.
  const eigenstaendig = elemente.filter((e) => !(e.type === "text" && e.containerId));

  // Kind ragt über seinen Frame hinaus
  for (const el of eigenstaendig) {
    if (el.type === "frame" || !el.frameId) continue;
    const frame = nachId.get(el.frameId);
    if (frame && !liegtInnerhalb(el, frame)) {
      befunde.warn("framegrenze", `Element ragt über den Frame "${frame.name}" hinaus`, el.id);
    }
  }

  // Überlappungen zwischen eigenständigen Nicht-Frame-Elementen
  const koerper = eigenstaendig.filter((e) => e.type !== "frame");
  for (let i = 0; i < koerper.length; i++) {
    for (let j = i + 1; j < koerper.length; j++) {
      if (ueberlappen(koerper[i], koerper[j])) {
        befunde.warn("ueberlappung", `Element überlappt mit "${koerper[j].id}"`, koerper[i].id);
      }
    }
  }
}
