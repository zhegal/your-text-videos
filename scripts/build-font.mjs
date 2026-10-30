import opentype from "opentype.js";
import { readFileSync, writeFileSync } from "node:fs";

const glyphs = {};
const metrics = [];
for (const name of ["ArchivoBlack-Regular.ttf", "Roboto-Black.ttf"]) {
  const data = readFileSync(
    new URL(`../public/fonts/${name}`, import.meta.url),
  );
  const font = opentype.parse(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  );
  const scale = 716 / font.charToGlyph("H").getBoundingBox().y2;
  metrics.push({ font, scale });
  for (const code of Object.keys(font.encoding.cmap.glyphIndexMap)) {
    const char = String.fromCodePoint(Number(code));
    if (glyphs[char]) continue;
    const glyph = font.charToGlyph(char);
    const outline = glyph.path.commands
      .map((command) => {
        const values = [
          command.type === "C" ? "b" : command.type.toLowerCase(),
        ];
        for (const [x, y] of [
          ["x", "y"],
          ["x1", "y1"],
          ["x2", "y2"],
        ]) {
          if (command[x] !== undefined)
            values.push(
              Math.round(command[x] * scale),
              Math.round(command[y] * scale),
            );
        }
        return values.join(" ");
      })
      .join(" ");
    glyphs[char] = { ha: Math.round(glyph.advanceWidth * scale), o: outline };
  }
}
writeFileSync(
  new URL("../public/fonts/chrome-bold.json", import.meta.url),
  JSON.stringify({
    glyphs,
    familyName: "Your Text Display",
    resolution: 1000,
    ascender: Math.max(
      ...metrics.map(({ font, scale }) => font.ascender * scale),
    ),
    descender: Math.min(
      ...metrics.map(({ font, scale }) => font.descender * scale),
    ),
    boundingBox: {
      yMin: Math.min(
        ...metrics.map(({ font, scale }) => font.tables.head.yMin * scale),
      ),
      yMax: Math.max(
        ...metrics.map(({ font, scale }) => font.tables.head.yMax * scale),
      ),
    },
    underlineThickness:
      metrics[0].font.tables.post.underlineThickness * metrics[0].scale,
  }),
);
console.log(`Built ${Object.keys(glyphs).length} glyphs`);
