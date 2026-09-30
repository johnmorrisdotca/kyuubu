/**
 * THE CUBE: the vocabulary of a turning cube of any size.
 *
 * A cube of side `n` is `6 × n × n` stickers. Its state is written as one
 * letter a sticker (`CUBE_FACE_ORDER` in `cube.ts`: up, right, front, down,
 * left, back, each face read in rows as it is seen from outside), and every
 * letter is the colour of the face it belongs on when solved.
 *
 * A turn is a layer turned about one of the three axes: x points right, y up
 * and z at the reader, as the cube sits before it is turned in the hand. The
 * layers are counted along the axis from its negative side, 0 to n − 1, and a
 * turn is one, two or three quarter turns by the right-hand rule (counter-
 * clockwise seen from the positive side). "All" turns every layer at once:
 * the whole cube turned in the hand, which moves nothing relative to itself
 * and is never counted as a move.
 */

export type CubeAxis = 0 | 1 | 2;

/** One, two or three quarter turns, counter-clockwise seen from the axis's positive end. */
export type CubeTurns = 1 | 2 | 3;

export type CubeMove = {
  axis: CubeAxis;
  /** The layer, 0 to n − 1 from the axis's negative side; "all" for the whole cube. */
  layer: number | "all";
  turns: CubeTurns;
};

/** A point in the cube's doubled coordinates: a cubie's centre is a whole even or odd step from the middle, by the cube's size. */
export type Vec3 = readonly [number, number, number];

/** Where one sticker slot sits: its cubie's centre and the direction it faces. */
export type StickerSlot = { centre: Vec3; normal: Vec3 };
