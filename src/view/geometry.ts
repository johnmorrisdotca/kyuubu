import type { CubeAxis, Vec3 } from "../types.ts";

/**
 * THE SCREEN'S GEOMETRY. The cube is modelled with y up and z towards the
 * viewer; CSS has y down. So every vector crosses to the screen through
 * `toCss` (y flipped), and every transform is written out as a `matrix3d`
 * rather than as CSS rotations, whose sense of "positive" is not the model's.
 */

/** A 3×3 matrix, rows of three. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

/** The matrix that changes nothing. */
export const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** A matrix applied to a vector. */
export function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/** Two matrices as one: `b` first, then `a`. */
export function multiply(a: Mat3, b: Mat3): Mat3 {
  const col = (j: number): Vec3 => [b[0][j], b[1][j], b[2][j]];
  const cols = [apply(a, col(0)), apply(a, col(1)), apply(a, col(2))];
  return [
    [cols[0][0], cols[1][0], cols[2][0]],
    [cols[0][1], cols[1][1], cols[2][1]],
    [cols[0][2], cols[1][2], cols[2][2]],
  ];
}

/** A turn of `radians` about a model axis, counter-clockwise seen from its positive end. */
export function rotation(axis: CubeAxis, radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  if (axis === 0) return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === 1) return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

/** The way the viewer looks at the cube: turned about the model's y (yaw), then tipped about the screen's x (pitch), in degrees. */
export function viewMatrix(yaw: number, pitch: number): Mat3 {
  return multiply(rotation(0, (pitch * Math.PI) / 180), rotation(1, (yaw * Math.PI) / 180));
}

/** A model vector as CSS has it: y down. */
export function toCss(v: Vec3): Vec3 {
  return [v[0], -v[1], v[2]];
}

const round = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6)));

/**
 * A CSS `matrix3d` placing an element: its own x along `right`, its own y
 * along `down`, its own z along `out` (all model vectors), its centre at
 * `at` — every one scaled to pixels by the caller.
 */
export function placement(right: Vec3, down: Vec3, out: Vec3, at: Vec3): string {
  const [r, d, o, t] = [toCss(right), toCss(down), toCss(out), toCss(at)];
  return `matrix3d(${[r[0], r[1], r[2], 0, d[0], d[1], d[2], 0, o[0], o[1], o[2], 0, t[0], t[1], t[2], 1].map(round).join(",")})`;
}

/** A CSS `matrix3d` for a linear transform given in model space. */
export function cssMatrix(m: Mat3, scale = 1): string {
  // Model space is reached through the y flip on both sides, S · M · S: the screen's own y is the model's down.
  return placement(apply(m, [scale, 0, 0]), apply(m, [0, -scale, 0]), apply(m, [0, 0, scale]), [0, 0, 0]);
}

/** The cross product of two vectors. */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** The unit vector along an axis. */
export function axisVector(axis: CubeAxis): Vec3 {
  return axis === 0 ? [1, 0, 0] : axis === 1 ? [0, 1, 0] : [0, 0, 1];
}

/** The axis a unit vector lies along. */
export function axisOf(v: Vec3): CubeAxis {
  return (v[0] !== 0 ? 0 : v[1] !== 0 ? 1 : 2) as CubeAxis;
}

/** Where a model vector points on the screen, in pixels' directions (x right, y down), as the viewer sees it. */
export function onScreen(view: Mat3, v: Vec3): [number, number] {
  const seen = apply(view, v);
  return [seen[0], -seen[1]];
}
