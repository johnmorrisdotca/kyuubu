import type { KyuubuLanguage } from "../words.ts";

import type { CuboidDims } from "./model.ts";

/**
 * THE NAMED CUBOIDS: the shapes people know, each with a name, the way it is
 * best seen, and a line on what makes it different. The name is the package's
 * own for the plainer shapes; the shapes themselves are nobody's. Any `a × b ×
 * c` from 1 to 7 is a cuboid whether or not it has a name here.
 *
 * `dims` is as the puzzle is first drawn (flat shapes face the reader, tall
 * ones stand); `label` is its sides in order, so `3×3×2` and `2×3×3` are one
 * shape and are listed once.
 */
export type CuboidPreset = {
  /** A kebab-case key: `floppy`, `tall-pillar`. */
  key: string;
  /** Its sides, smallest first: `2×3×3`. */
  label: string;
  /** How it is first drawn: width, height and depth. */
  dims: CuboidDims;
  /** Its name, and what is special about it, in each language. */
  name: Readonly<Record<KyuubuLanguage, string>>;
  says: Readonly<Record<KyuubuLanguage, string>>;
};

/** The named cuboids, smallest first. */
export const CUBOID_PRESETS: readonly CuboidPreset[] = [
  {
    key: "brick",
    label: "1×2×3",
    dims: [3, 2, 1],
    name: { en: "Brick", ja: "レンガ" },
    says: { en: "The smallest with a name: five turns, all half turns, and 192 states in all.", ja: "名前のある中で最小です。回し方は5つ、すべて半回転で、状態は全部で192通りです。" },
  },
  {
    key: "floppy",
    label: "1×3×3",
    dims: [3, 3, 1],
    name: { en: "Floppy", ja: "フロッピー" },
    says: { en: "A flat 3×3 one cubie thick: half turns only, 768 states (192 if only the outer slices turn).", ja: "厚さ1の平たい3×3です。半回転だけで、状態は768通りです（外側の層だけ回すなら192通り）。" },
  },
  {
    key: "tower",
    label: "2×2×3",
    dims: [2, 3, 2],
    name: { en: "Tower", ja: "タワー" },
    says: { en: "A 2×2 with a layer added: the three layers turn a quarter, the sides only a half.", ja: "2×2に層をひとつ足した形です。3つの層は1/4回転でき、側面は半回転だけです。" },
  },
  {
    key: "domino",
    label: "2×3×3",
    dims: [3, 2, 3],
    name: { en: "Domino", ja: "ドミノ" },
    says: { en: "A 3×3 cut in half: the two 3×3 slices turn a quarter, the sides only a half.", ja: "3×3を半分にした形です。2つの3×3の層は1/4回転でき、側面は半回転だけです。" },
  },
  {
    key: "block",
    label: "2×3×4",
    dims: [2, 4, 3],
    name: { en: "Block", ja: "ブロック" },
    says: { en: "No slice is square, so every turn of it is a half turn.", ja: "どの層も正方形ではないので、すべての回転が半回転です。" },
  },
  {
    key: "pillar",
    label: "3×3×4",
    dims: [3, 4, 3],
    name: { en: "Pillar", ja: "ピラー" },
    says: { en: "A 3×3 with a fourth layer: the four layers turn a quarter, the long sides only a half.", ja: "3×3に4つ目の層を足した形です。4つの層は1/4回転でき、長い側面は半回転だけです。" },
  },
  {
    key: "tall-pillar",
    label: "3×3×5",
    dims: [3, 5, 3],
    name: { en: "Tall pillar", ja: "トールピラー" },
    says: { en: "The pillar with a fifth layer, and the biggest of the named shapes.", ja: "ピラーに5つ目の層を足した形で、名前のある中で最大です。" },
  },
];

/** The named cuboid with this key, or undefined. */
export function cuboidPreset(key: string): CuboidPreset | undefined {
  return CUBOID_PRESETS.find((preset) => preset.key === key);
}
