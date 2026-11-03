import { CUBOID_MAX_SIDE, CUBOID_PRESETS, type CuboidDims, parseCuboidDims } from "../src/cuboid/index.ts";

export const dimsOf = (text: string) => parseCuboidDims(text)!;
/** Every shape up to turning it in the hand, from 1 to 7 on a side and not 1×1×1: 83 of them. */
export const SHAPES: CuboidDims[] = [];
for (let a = 1; a <= CUBOID_MAX_SIDE; a += 1)
  for (let b = a; b <= CUBOID_MAX_SIDE; b += 1)
    for (let c = b; c <= CUBOID_MAX_SIDE; c += 1) if (c > 1) SHAPES.push([a, b, c]);
export const NAMED = CUBOID_PRESETS.map((preset) => preset.dims);
/** The same shapes as they might be asked for, with the sides in every order. */
export const ORDERS = (dims: CuboidDims): CuboidDims[] => [
  [dims[0], dims[1], dims[2]],
  [dims[1], dims[2], dims[0]],
  [dims[2], dims[0], dims[1]],
];
