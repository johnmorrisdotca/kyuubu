/**
 * HOW BIG A CUBE IS DRAWN, as a setting: `small` for a list or a picker,
 * `medium`, and `large`. The same names, in the same order, as Toranpu's
 * cards, so a page that uses both says one thing. (A cube's `size` is its
 * side, 2 to 7, so the setting here is `scale`.)
 *
 * @example
 * ```ts
 * import { CUBE_SCALES } from "@johnmorrisdotca/kyuubu";
 * 
 * console.log(CUBE_SCALES);
 * ```
 */
export const CUBE_SCALES = ["small", "medium", "large"] as const;

/** One of the three.
 *
 * @example
 * ```ts
 * import type { CubeScale } from "@johnmorrisdotca/kyuubu";
 * 
 * 
 * const value: CubeScale = "small";
 * console.log(value);
 * ```
 */
export type CubeScale = (typeof CUBE_SCALES)[number];

/** How wide each is, in pixels: a cube is as tall as it is wide.
 *
 * @example
 * ```ts
 * import { CUBE_SCALE_PX } from "@johnmorrisdotca/kyuubu";
 * 
 * console.log(CUBE_SCALE_PX);
 * ```
 */
export const CUBE_SCALE_PX: Readonly<Record<CubeScale, number>> = { small: 72, medium: 160, large: 300 };

/** What a cube drawn at each scale is, apart from its width: a small one is for looking at, so it is not turned by a hand or a key unless asked.
 *
 * @example
 * ```ts
 * import { CUBE_SCALE_INTERACTIVE } from "@johnmorrisdotca/kyuubu";
 * 
 * console.log(CUBE_SCALE_INTERACTIVE);
 * ```
 */
export const CUBE_SCALE_INTERACTIVE: Readonly<Record<CubeScale, boolean>> = { small: false, medium: true, large: true };

/** Whether a value is one of the three scales.
 *
 * @param value - The attribute or candidate value to validate.
 * @returns Whether a value is one of the three scales.
 *
 * @example
 * ```ts
 * import { isCubeScale } from "@johnmorrisdotca/kyuubu";
 * 
 * console.log(isCubeScale("small"));
 * ```
 */
export function isCubeScale(value: unknown): value is CubeScale {
  return typeof value === "string" && (CUBE_SCALES as readonly string[]).includes(value);
}

/**
 * The width in pixels a cube is drawn at: `width` when it is a number above
 * zero, and otherwise the scale's. Null when neither is given, which leaves
 * the cube filling whatever box it is in.
 *
 * @param scale - The named drawing size, or null to leave the host in control.
 * @param width - An explicit width in pixels; invalid or omitted widths use the scale.
 * @returns The width in pixels a cube is drawn at: `width` when it is a number above zero, and otherwise the scale's. null when neither is given, which leaves the cube filling whatever box it is in.
 *
 * @example
 * ```ts
 * import { cubeWidthPx } from "@johnmorrisdotca/kyuubu";
 * 
 * console.log(cubeWidthPx("small"));
 * ```
 */
export function cubeWidthPx(scale?: CubeScale, width?: number): number | null {
  if (width !== undefined && Number.isFinite(width) && width > 0) return Math.round(width);
  return scale === undefined ? null : CUBE_SCALE_PX[scale];
}
