import type { CubeAxis, CubeTurns } from "../types.ts";

/**
 * THE CUBOID: a turning puzzle shaped like a box, `a × b × c` cubies with each
 * side from 1 to 7, as pure functions over a string, the way `cube.ts` does a
 * cube. The state is one letter a sticker, faces in the order up, right,
 * front, down, left, back, each read in rows as it is seen from outside; the
 * letter is the colour of the face it belongs on when solved.
 *
 * `dims` is `[x, y, z]`: the width (left to right), the height (up) and the
 * depth (towards the reader) of the puzzle as it sits before it is turned in
 * the hand. A layer is a slice of it across one axis, counted from that axis's
 * negative side. What differs from a cube is one rule: a layer may turn a
 * quarter only if its slice is square, because a quarter turn of a slice that
 * is not square would push its corners out of the box. Every layer may turn a
 * half turn. A slice that is the whole puzzle (an axis only one cubie deep) is
 * not a layer: turning it moves nothing relative to the rest.
 */

/** The width, height and depth of a cuboid, in cubies: each a whole number from 1 to 7.
 *
 * @example
 * ```ts
 * import type { CuboidDims } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 *
 * const value: CuboidDims = [2, 3, 3];
 * console.log(value);
 * ```
 */
export type CuboidDims = readonly [number, number, number];

/** One turn of a layer: its axis, its layer from the axis's negative side (0 to the axis's depth − 1), and one, two or three quarter turns by the right-hand rule. A two is a half turn, the only turn of a layer whose slice is not square.
 *
 * @example
 * ```ts
 * import type { CuboidMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * import { parseCuboidMove } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * const value: CuboidMove = parseCuboidMove("R", [2, 3, 3])!;
 * console.log(value);
 * ```
 */
export type CuboidMove = { axis: CubeAxis; layer: number; turns: CubeTurns };

/** The least a side of a cuboid can be.
 *
 * @example
 * ```ts
 * import { CUBOID_MIN_SIDE } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * console.log(CUBOID_MIN_SIDE);
 * ```
 */
export const CUBOID_MIN_SIDE = 1;
/** The most a side of a cuboid can be.
 *
 * @example
 * ```ts
 * import { CUBOID_MAX_SIDE } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * console.log(CUBOID_MAX_SIDE);
 * ```
 */
export const CUBOID_MAX_SIDE = 7;

/** Whether this is a cuboid the package makes: three whole numbers from 1 to 7, and not 1×1×1, which has nothing to turn.
 *
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns Whether this is a cuboid the package makes: three whole numbers from 1 to 7, and not 1×1×1, which has nothing to turn.
 *
 * @example
 * ```ts
 * import { isCuboidDims } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * console.log(isCuboidDims([2, 3, 3]));
 * ```
 */
export function isCuboidDims(dims: unknown): dims is CuboidDims {
  return (
    Array.isArray(dims) &&
    dims.length === 3 &&
    dims.every((side) => Number.isInteger(side) && side >= CUBOID_MIN_SIDE && side <= CUBOID_MAX_SIDE) &&
    dims.some((side) => side > 1)
  );
}

/** A cuboid's name as it is written: `2×3×3`.
 *
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns A cuboid's name as it is written: `2×3×3`.
 *
 * @example
 * ```ts
 * import { cuboidName } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * const dims = [2, 3, 3] as const;
 * console.log(cuboidName(dims));
 * ```
 */
export function cuboidName(dims: CuboidDims): string {
  return dims.join("×");
}

/** A cuboid read from `2x3x3`, `2×3×3`, `2 3 3` or `2,3,3`: its dims, or null where it is not one the package makes.
 *
 * @param text - The text to parse or format.
 * @returns A cuboid read from `2x3x3`, `2×3×3`, `2 3 3` or `2,3,3`: its dims, or null where it is not one the package makes.
 *
 * @example
 * ```ts
 * import { parseCuboidDims } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * console.log(parseCuboidDims("2x3x3"));
 * ```
 */
export function parseCuboidDims(text: string): CuboidDims | null {
  const found = /^\s*(\d)\s*[x×*,\s]\s*(\d)\s*[x×*,\s]\s*(\d)\s*$/i.exec(text);
  if (found === null) return null;
  const dims = [Number(found[1]), Number(found[2]), Number(found[3])];
  return isCuboidDims(dims) ? (dims as unknown as CuboidDims) : null;
}

/** Whether two cuboids are the same puzzle turned about in the hand: the same three sides in any order.
 *
 * @param a - The first cuboid’s three dimensions.
 * @param b - The second cuboid’s three dimensions.
 * @returns Whether two cuboids are the same puzzle turned about in the hand: the same three sides in any order.
 *
 * @example
 * ```ts
 * import { sameCuboid } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * console.log(sameCuboid([2, 3, 3], [3, 2, 3]));
 * ```
 */
export function sameCuboid(a: CuboidDims, b: CuboidDims): boolean {
  const sorted = (dims: CuboidDims) => [...dims].sort((x, y) => x - y).join(",");
  return sorted(a) === sorted(b);
}
