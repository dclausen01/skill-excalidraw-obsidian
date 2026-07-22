import { ABSTAND, LESBARKEIT_MIN, istLesbar } from "../style.js";
import { innerDimension } from "../elements.js";
import { measureText } from "../text.js";

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

/**
 * Passt der gebundene Text in die einbeschriebene Fläche seines Containers?
 * Die Innenmaße kommen aus derselben Funktion, die die Element-Fabriken
 * benutzen — sonst gäbe es zwei Formeln für dieselbe Form.
 */
export function checkTextFit(elemente, registry, befunde) {
  const nachId = new Map(elemente.map((e) => [e.id, e]));

  for (const text of elemente) {
    if (text.type !== "text" || !text.containerId) continue;
    const container = nachId.get(text.containerId);
    if (!container) continue; // Fehlende Bindung meldet bereits checkReferences.

    // Nur echte einbeschriebene Formen haben eine sinnvolle "einbeschriebene
    // Fläche" — ein Pfeil-Label (containerId zeigt auf den Pfeil, siehe
    // scene.js connect()) sitzt auf dem Pfeil, nicht darin. Für einen
    // horizontalen Pfeil ist die Bounding-Box-Höhe ≈ 0, was ohne diese
    // Gate eine negative innenHoehe und einen falschen Befund erzeugte
    // (Schlussprüfung, Finding 1).
    if (!["rectangle", "ellipse", "diamond"].includes(container.type)) continue;

    const innenBreite = innerDimension(container.width, container.type);
    const innenHoehe = innerDimension(container.height, container.type);

    const gemessen = measureText(
      text.originalText,
      { fontFamily: text.fontFamily, fontSize: text.fontSize, maxBreite: innenBreite },
      registry,
    );

    if (gemessen.hoehe > innenHoehe) {
      befunde.warn(
        "textpassung",
        `Text braucht ${Math.round(gemessen.hoehe)} Einheiten Höhe, die einbeschriebene Fläche bietet ${Math.round(innenHoehe)}`,
        text.id,
      );
    }
  }
}

/**
 * Lesbarkeit auf den beiden Zoomstufen. Elemente tragen ihre Zielstufe nicht
 * mit sich, prüfbar ist deshalb: jeder Text muss auf L1 lesbar sein, und
 * mindestens einer auf L0 — sonst bietet die Übersicht keine Orientierung.
 */
export function checkLegibility(elemente, zoomL0, befunde) {
  const texte = elemente.filter((e) => e.type === "text");

  for (const text of texte) {
    if (!istLesbar(text.fontSize, 1)) {
      befunde.warn(
        "lesbarkeit-l1",
        `Schriftgröße ${text.fontSize} liegt unter ${LESBARKEIT_MIN} und ist auf Kapitelebene schwer lesbar`,
        text.id,
      );
    }
  }

  if (texte.length > 0 && !texte.some((t) => istLesbar(t.fontSize, zoomL0))) {
    befunde.warn(
      "lesbarkeit-l0",
      `Kein Text ist in der Gesamtübersicht lesbar (Zoomfaktor ${zoomL0.toFixed(2)}); nötig wären mindestens ${Math.ceil(LESBARKEIT_MIN / zoomL0)} Einheiten Schriftgröße`,
    );
  }
}
