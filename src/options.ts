import type { KyuubuLanguage } from "./words.ts";

/**
 * EVERY CHOICE THE PACKAGE OFFERS, as a list a page can be built from: the
 * demo's builder draws one control for each, groups them, says one plain line
 * about each, and writes the code that makes the cube they describe. A new
 * option is a row here; `test/options.test.ts` fails until every option of the
 * view, of the player and of the two custom elements is a row, or is named in
 * `CUBE_OPTIONS_LEFT_OUT` with its reason, so the builder cannot fall behind
 * the package.
 *
 * A cube is made in one of three ways, and a row says what each calls the
 * option: `view` is `CubeView` (and `<Kyuubu />`: a cube a person turns),
 * `player` is `mountPlayer` (a solve played back; `<kyuubu-cube>` and the embed
 * page take the same, as `cube`), and `turning` is `<kyuubu-scramble>` (a cube
 * that keeps turning by itself). A box-shaped puzzle has the same three ways,
 * under `cuboid` (`CuboidView`), `cuboidPlayer` (`mountCuboidPlayer`) and
 * `cuboidElement` (`<kyuubu-cuboid>`), and shares a row with the cube wherever
 * the choice is the same one; the builder page draws the cube's three.
 */

/** How a choice is made: a number in a range, on or off, one of a few, a colour, or text (moves are text with notation in it).
 *
 * @example
 * ```ts
 * import type { OptionKind } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: OptionKind = "boolean";
 * console.log(value);
 * ```
 */
export type OptionKind = "number" | "boolean" | "choice" | "colour" | "text" | "moves";

/** The three ways a cube is made.
 *
 * @example
 * ```ts
 * import type { CubeMaker } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: CubeMaker = "player";
 * console.log(value);
 * ```
 */
export type CubeMaker = "view" | "player" | "turning";

/** What the choices are gathered under, in the order a page shows them.
 *
 * @example
 * ```ts
 * import type { OptionGroup } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: OptionGroup = "replay";
 * console.log(value);
 * ```
 */
export type OptionGroup = "size" | "look" | "turning" | "input" | "scramble" | "solve" | "replay" | "guide" | "words";

/** One choice.
 *
 * @example
 * ```ts
 * import type { CubeOption } from "@johnmorrisdotca/kyuubu";
 * import { CUBE_OPTIONS } from "@johnmorrisdotca/kyuubu";
 *
 * const value: CubeOption = CUBE_OPTIONS[0]!;
 * console.log(value.id);
 * ```
 */
export type CubeOption = {
  /** Its one name, in kebab case: what the builder's controls and its address call it. */
  id: string;
  group: OptionGroup;
  kind: OptionKind;
  /** What it is when nothing is said: the same as leaving it out. Absent where leaving it out is its own state (no theme, no scale). */
  default?: string | number | boolean;
  /** The ways to choose from, for a `choice`. */
  choices?: readonly string[];
  /** The least, the most and the step, for a `number`. */
  range?: { min: number; max: number; step: number };
  /** What each way of making a cube calls it: `view` the `CubeView` option (`colours.U` is one face), `player` the `mountPlayer` option, `cube` the attribute of `<kyuubu-cube>` and the embed's address, `turning` the attribute of `<kyuubu-scramble>`; and for a cuboid, `cuboid` the `CuboidView` option, `cuboidPlayer` the `mountCuboidPlayer` option and `cuboidElement` the attribute of `<kyuubu-cuboid>`. Absent where that way does not have it. */
  names: {
    view?: string;
    player?: string;
    cube?: string;
    turning?: string;
    cuboid?: string;
    cuboidPlayer?: string;
    cuboidElement?: string;
  };
  /** What the player's option is worth in this option's own unit: `timeMs` is milliseconds and `time` seconds. */
  factor?: { player?: number };
  /** The label and the one plain line, in each language. */
  say: Record<KyuubuLanguage, { label: string; help: string }>;
};
export { CUBE_OPTION_GROUPS, CUBE_OPTIONS, CUBE_OPTIONS_LEFT_OUT } from "./options.data.ts";
