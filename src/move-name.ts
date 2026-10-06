import { WORDS, fill, type CubeWords, type KyuubuLanguage } from "./words.ts";

/**
 * A MOVE IN A FEW PLAIN WORDS, for the line that says what the code on the
 * screen turns: `R'` is "Right face, anticlockwise", `Rw` "Right two layers,
 * clockwise", `x2` "Whole cube on x, twice". It reads the standard form
 * `parseSolve` writes (`R`, `Rw'`, `3Uw2`, `2R`, `M`, `x`), so it names what a
 * solve's steps and what `moveNotation` writes alike. The longer sentence a
 * guide gives for the next move to make (`movementSays`) is a different thing:
 * that one says how to turn the cube with your hands, this one names the move.
 */

const SIDES: Record<string, keyof CubeWords> = { R: "guideSideR", L: "guideSideL", U: "guideSideU", D: "guideSideD", F: "guideSideF", B: "guideSideB" };
const SLICES: Record<string, { name: keyof CubeWords; like: string }> = {
  M: { name: "moveSliceM", like: "L" },
  E: { name: "moveSliceE", like: "D" },
  S: { name: "moveSliceS", like: "F" },
};
const COUNTS: Record<number, keyof CubeWords> = { 2: "moveCount2", 3: "moveCount3", 4: "moveCount4", 5: "moveCount5", 6: "moveCount6" };

const FACE = /^([2-7]?)([RLUDFB])(w?)(2|')?$/;
const OTHER = /^([MESxyz])(2|')?$/;

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * What a move turns, in a few plain words, in English or Japanese; null for
 * anything that is not a move in standard form.
 *
 * @example
 * moveName("R'"); // "Right face, anticlockwise"
 * moveName("Rw"); // "Right two layers, clockwise"
 * moveName("x2"); // "Whole cube on x, twice"
 * moveName("R'", "ja"); // "右の面、反時計回り"
 */
export function moveName(code: string, language: KyuubuLanguage = "en"): string | null {
  const words = WORDS[language];
  const face = FACE.exec(code);
  const other = face === null ? OTHER.exec(code) : null;
  if (face === null && other === null) return null;
  const suffix = (face === null ? other![2] : face[4]) ?? "";
  const amount = suffix === "2" ? words.moveTwice : suffix === "'" ? words.moveCcw : words.moveCw;
  const join = (what: string) => fill(words.moveSays, { what, amount });
  if (face !== null) {
    const [, depth, letter, wide] = face;
    const side = capital(words[SIDES[letter]]);
    if (wide === "w") {
      const count = depth === "" ? 2 : Number(depth);
      return COUNTS[count] === undefined ? null : join(fill(words.moveLayers, { side, count: words[COUNTS[count]] }));
    }
    if (depth === "") return join(fill(words.moveFace, { side }));
    return join(fill(words.moveLayer, { side, depth }));
  }
  const letter = other![1];
  const slice = SLICES[letter];
  if (slice !== undefined) {
    const name = words[slice.name];
    // A half turn has no way round; a quarter turn goes the way the face beside it does.
    if (suffix === "2") return join(name);
    return fill(words.moveSliceWay, { slice: name, side: capital(words[SIDES[slice.like]]), amount });
  }
  return join(fill(words.moveWhole, { axis: letter }));
}
