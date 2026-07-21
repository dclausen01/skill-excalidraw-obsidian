import LZString from "lz-string";

const KOMPRIMIERT = /```compressed-json\n([\s\S]*?)\n```/;
const KLARTEXT = /```json\n([\s\S]*?)\n```/;

/** Wandelt den Inhalt eines compressed-json-Blocks in JSON-Text. */
export function decompress(block) {
  // Das Plugin bricht den Base64-String über mehrere Zeilen um.
  const bereinigt = block.replace(/[\n\r\t ]/g, "");
  const json = LZString.decompressFromBase64(bereinigt);
  if (!json) throw new Error("compressed-json ließ sich nicht dekomprimieren");
  return json;
}

/** Löst den Drawing-Block aus einer .excalidraw.md, komprimiert oder nicht. */
export function extractDrawing(markdown) {
  const k = markdown.match(KOMPRIMIERT);
  if (k) return { json: decompress(k[1]), komprimiert: true };

  const j = markdown.match(KLARTEXT);
  if (j) return { json: j[1], komprimiert: false };

  throw new Error("Kein Drawing-Block gefunden — ist das eine Excalidraw-Datei?");
}
