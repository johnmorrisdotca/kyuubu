import { CUBE_FACE_ORDER, type CubeFace, FACE_FRAMES } from "../cube.ts";
import type { CubeAxis, StickerSlot, Vec3 } from "../types.ts";
import type { CuboidDims } from "./dims.ts";

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const axisOfVector = (v: Vec3): CubeAxis => (v[0] !== 0 ? 0 : v[1] !== 0 ? 1 : 2);
export const keyOf = (slot: StickerSlot) => `${slot.centre.join(",")}|${slot.normal.join(",")}`;

/** One face of a cuboid: how many columns and rows of stickers it has as it is seen from outside, and where its stickers begin in the state.
 *
 * @example
 * ```ts
 * import type { CuboidFace } from "@johnmorrisdotca/kyuubu/cuboid";
 * import { cuboidFaces } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * const value: CuboidFace = cuboidFaces([2, 3, 3])[0]!;
 * console.log(value.face);
 * ```
 */
export type CuboidFace = { face: CubeFace; cols: number; rows: number; start: number };

const facesBySize = new Map<string, readonly CuboidFace[]>();

/** The six faces of a cuboid, in the order the state is written, with their size and where each begins.
 *
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns The six faces of a cuboid, in the order the state is written, with their size and where each begins.
 *
 * @example
 * ```ts
 * import { cuboidFaces } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * const dims = [2, 3, 3] as const;
 * console.log(cuboidFaces(dims));
 * ```
 */
export function cuboidFaces(dims: CuboidDims): readonly CuboidFace[] {
  const key = dims.join(",");
  const known = facesBySize.get(key);
  if (known !== undefined) return known;
  let start = 0;
  const made = CUBE_FACE_ORDER.map((face) => {
    const frame = FACE_FRAMES[face];
    const cols = dims[axisOfVector(frame.right)];
    const rows = dims[axisOfVector(frame.down)];
    const one = { face, cols, rows, start };
    start += cols * rows;
    return one;
  });
  facesBySize.set(key, made);
  return made;
}

/** How many stickers a cuboid has: the area of its surface.
 *
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns How many stickers a cuboid has: the area of its surface.
 *
 * @example
 * ```ts
 * import { cuboidStickerCount } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * const dims = [2, 3, 3] as const;
 * console.log(cuboidStickerCount(dims));
 * ```
 */
export function cuboidStickerCount(dims: CuboidDims): number {
  return 2 * (dims[0] * dims[1] + dims[1] * dims[2] + dims[0] * dims[2]);
}

const slotsBySize = new Map<string, { slots: StickerSlot[]; index: Map<string, number> }>();

/** Every sticker slot of a cuboid, in the order its state is written, and the way back from a slot to its place. A slot's centre is in doubled coordinates, so a cubie's is a whole step from the middle along each axis.
 *
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns Every sticker slot of a cuboid, in the order its state is written, and the way back from a slot to its place. A slot's centre is in doubled coordinates, so a cubie's is a whole step from the middle along each axis.
 *
 * @example
 * ```ts
 * import { cuboidSlots } from "@johnmorrisdotca/kyuubu/cuboid";
 *
 * const dims = [2, 3, 3] as const;
 * console.log(cuboidSlots(dims).slots.length);
 * ```
 */
export function cuboidSlots(dims: CuboidDims): { slots: readonly StickerSlot[]; index: ReadonlyMap<string, number> } {
  const key = dims.join(",");
  const known = slotsBySize.get(key);
  if (known !== undefined) return known;
  const slots: StickerSlot[] = [];
  for (const { face, cols, rows } of cuboidFaces(dims)) {
    const frame = FACE_FRAMES[face];
    const depth = dims[axisOfVector(frame.normal)];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const centre = add(
          add(scale(frame.normal, depth - 1), scale(frame.right, 2 * col - (cols - 1))),
          scale(frame.down, 2 * row - (rows - 1)),
        );
        slots.push({ centre, normal: frame.normal });
      }
    }
  }
  const made = { slots, index: new Map(slots.map((slot, at) => [keyOf(slot), at])) };
  slotsBySize.set(key, made);
  return made;
}
