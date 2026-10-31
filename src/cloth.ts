/**
 * THE CLOTHS A PLAYER'S STAGE MAY BE LAID IN: the same five the whole family offers, and itsutsu.com's boards:
 * green, blue, red, black and wood. Each is the felt's colour, its deep edge and the ink written on it.
 * Given to a player as its `--kyuubu-player-felt`, the stage behind the cube; a player with no cloth keeps a clear stage.
 *
 * @example
 * ```ts
 * import { KYUUBU_CLOTHS } from "@johnmorrisdotca/kyuubu";
 * console.log(Object.keys(KYUUBU_CLOTHS));
 * ```
 */
export const KYUUBU_CLOTHS = {
  green: { felt: "#2f5d4a", deep: "#1f4135", ink: "#f3efe4" },
  blue: { felt: "#2865a6", deep: "#1a4677", ink: "#f3efe4" },
  red: { felt: "#a3342e", deep: "#7a231f", ink: "#f3efe4" },
  black: { felt: "#2f3236", deep: "#1b1d20", ink: "#ece8dc" },
  wood: { felt: "#e2ba7a", deep: "#c4954f", ink: "#2b1d0e" },
} as const;

/** A cloth's name.
 *
 * @example
 * ```ts
 * import type { Cloth } from "@johnmorrisdotca/kyuubu";
 * const value: Cloth = "green";
 * console.log(value);
 * ```
 */
export type Cloth = keyof typeof KYUUBU_CLOTHS;

/** Whether a text names a cloth.
 *
 * @param text - Text to parse, validate or format.
 * @returns Whether a text names a cloth.
 *
 * @example
 * ```ts
 * import { isCloth } from "@johnmorrisdotca/kyuubu";
 * console.log(isCloth("green"), isCloth("unknown"));
 * ```
 */
export function isCloth(text: unknown): text is Cloth {
  return typeof text === "string" && Object.hasOwn(KYUUBU_CLOTHS, text);
}

/** A cloth as CSS variables; nothing for a name that is not a cloth, so the defaults stay.
 *
 * @param cloth - A built-in cloth name; an unknown name leaves the defaults.
 * @returns The CSS variables to set on the element, or an empty object.
 *
 * @example
 * ```ts
 * import { clothVars } from "@johnmorrisdotca/kyuubu";
 * console.log(clothVars("green"));
 * ```
 */
export function clothVars(cloth: string | undefined | null): Record<`--kyuubu-player-${string}`, string> {
  if (!isCloth(cloth)) return {};
  const { felt } = KYUUBU_CLOTHS[cloth];
  return { "--kyuubu-player-felt": felt };
}
