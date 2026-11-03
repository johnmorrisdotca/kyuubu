import { CUBE_FACE_ORDER, type CubeFace, cubeSlots, faceOfNormal } from "./cube.ts";
import type { Vec3 } from "./types.ts";

/** The colour a person calls white: the up face's letter in a solved cube. */
export const WHITE: CubeFace = "U";
/** The face across from each face. */
export const OPPOSITE: Record<CubeFace, CubeFace> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

/** A piece of the cube that moves as one: its centre and the sticker slots it carries. */
export type Cubie = { centre: Vec3; slots: number[] };

const cubiesBySize = new Map<number, Cubie[]>();

/** The pieces of the cube, each with the sticker slots it carries: corners three, edges two. Centres and a big cube's inner pieces are left out. */
export function cubiesOf(n: number): Cubie[] {
  const known = cubiesBySize.get(n);
  if (known !== undefined) return known;
  const byCentre = new Map<string, Cubie>();
  cubeSlots(n).slots.forEach((slot, at) => {
    const key = slot.centre.join(",");
    const cubie = byCentre.get(key) ?? { centre: slot.centre, slots: [] };
    cubie.slots.push(at);
    byCentre.set(key, cubie);
  });
  const made = [...byCentre.values()].filter((cubie) => cubie.slots.length >= 2);
  cubiesBySize.set(n, made);
  return made;
}

/** The face a sticker slot lies on. */
export const faceAt = (n: number, slot: number): CubeFace => faceOfNormal(cubeSlots(n).slots[slot].normal);

/** The colour each face is solved to, as the cube is now held: its centre on a 3×3; on a 2×2, read off the piece at the back left of the bottom, which the 2×2's first step never moves. */
export function faceColours(state: string, n: number): Record<CubeFace, string> {
  if (n % 2 === 1) {
    const middle = (n * n - 1) / 2;
    return Object.fromEntries(CUBE_FACE_ORDER.map((face, at) => [face, state[at * n * n + middle]])) as Record<
      CubeFace,
      string
    >;
  }
  const anchor = cubiesOf(n).find((cubie) => cubie.centre.every((value) => value < 0))!;
  const colours = {} as Record<CubeFace, string>;
  for (const slot of anchor.slots) {
    const face = faceAt(n, slot);
    colours[face] = state[slot];
    colours[OPPOSITE[face]] = OPPOSITE[state[slot] as CubeFace];
  }
  return colours;
}

/**
 * A piece's stickers followed through the search: the slot each is in now,
 * and the slots it may end in. For a piece put in its place, the one slot
 * that is its home. For a yellow sticker that only has to face up, any slot
 * on the top.
 */
type Tracked = { from: number; allowed: Set<number> };
/** A piece followed through a solve: each of its stickers and the slots it may sit in. */
export type Piece = { stickers: Tracked[] };

/** Where the piece whose home is `home` is now, and the slot each of its stickers belongs in. */
export function pieceHome(state: string, n: number, colours: Record<CubeFace, string>, home: Cubie): Piece {
  const wants = home.slots.map((slot) => colours[faceAt(n, slot)]);
  const key = [...wants].sort().join("");
  const now = cubiesOf(n).find(
    (cubie) =>
      cubie.slots.length === home.slots.length &&
      cubie.slots
        .map((slot) => state[slot])
        .sort()
        .join("") === key,
  )!;
  return {
    stickers: now.slots.map((from) => ({ from, allowed: new Set([home.slots[wants.indexOf(state[from])]]) })),
  };
}

/** A piece's yellow sticker, which has only to face up. */
export function yellowUp(state: string, n: number, colours: Record<CubeFace, string>, home: Cubie): Piece {
  const top = new Set(cubeSlots(n).slots.flatMap((_slot, at) => (faceAt(n, at) === "U" ? [at] : [])));
  const wants = home.slots.map((slot) => colours[faceAt(n, slot)]);
  const key = [...wants].sort().join("");
  const now = cubiesOf(n).find(
    (cubie) =>
      cubie.slots.length === home.slots.length &&
      cubie.slots
        .map((slot) => state[slot])
        .sort()
        .join("") === key,
  )!;
  const yellow = now.slots.find((slot) => state[slot] === colours.U)!;
  return { stickers: [{ from: yellow, allowed: top }] };
}
