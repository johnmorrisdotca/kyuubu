import type { Cloth } from "../cloth.ts";
import type { ReplayStatus } from "../replay.ts";
import type { CubeTheme } from "../view/view.ts";
import type { KyuubuLanguage } from "../words.ts";
import type { CuboidView } from "./draw.ts";
import type { CuboidReplayFault, CuboidReplayPlan, CuboidReplaySource } from "./replay.ts";

/**
 * A SOLVE ON A CUBOID ON A PAGE: the puzzle, and under it the few controls a
 * person needs to watch a solve: play and pause, a step either way, from the
 * start, where in the solve, how fast, and whether to repeat. `mountCuboidPlayer`
 * draws it in an element; the custom element is this and nothing more. As on
 * the cube's player (`player.ts`), whose classes and `--kyuubu-player-*`
 * custom properties it wears, the viewer can drag to look round the puzzle and
 * cannot turn its layers: the solve is someone's, and is shown as it was.
 * Like the cube's it names the move just made and lists the moves as buttons,
 * and the slider turns the puzzle where it goes. The words are the cube's, for
 * the moves a cuboid has: a half turn of a layer that is not square is `R2`,
 * and there is no x, y or z, because a cuboid turned whole is another puzzle.
 */

/** How a cuboid player is set up: the solve, and how it is shown.
 *
 * @example
 * ```ts
 * import type { CuboidPlayerOptions } from "@johnmorrisdotca/kyuubu/cuboid/play";
 *
 *
 * const value: CuboidPlayerOptions = { dims: [2, 3, 3], scramble: "R", solution: "R'", autoplay: false };
 * console.log(value.dims);
 * ```
 */
export type CuboidPlayerOptions = CuboidReplaySource & {
  /** Start playing as soon as it is drawn. */
  autoplay?: boolean;
  /** Begin again when it ends. */
  loop?: boolean;
  /** Show the controls: true unless said otherwise. A puzzle with none still plays when `autoplay` is set. */
  controls?: boolean;
  /** The speed it starts at: 1 is the solve's own pace. */
  speed?: number;
  /** The puzzle's colours. */
  theme?: CubeTheme;
  /** The cloth the stage behind the puzzle is laid in: "green", "blue", "red", "black" or "wood", the family's five. With none, the stage is clear. */
  cloth?: Cloth;
  /** Show the code of the move just made in large type, with what it turns in words, and say it to a screen reader as it changes. True unless said otherwise; with `controls: false`, off unless this says true. */
  readout?: boolean;
  /** Show the moves as buttons, the one just made marked and scrolled into view, each one taking the replay to it. True unless said otherwise; with `controls: false`, off unless this says true. */
  moveList?: boolean;
  /** Whether moving the slider, or choosing a move, turns the puzzle between where it was and where it goes. True unless said otherwise. */
  animateScrub?: boolean;
  /** English or Japanese; the page's `lang` when left out. */
  locale?: KyuubuLanguage;
  /** Called after every step, and whenever it starts, stops or is moved. */
  onChange?: (status: ReplayStatus) => void;
  /** Called each time the end is reached. */
  onEnd?: () => void;
};

/** A cuboid player on the page.
 *
 * @example
 * ```ts no-run
 * import type { CuboidPlayerHandle } from "@johnmorrisdotca/kyuubu/cuboid/play";
 * import { mountCuboidPlayer } from "@johnmorrisdotca/kyuubu/cuboid/play";
 *
 * const value: CuboidPlayerHandle = mountCuboidPlayer(document.createElement("div"), { dims: [2, 3, 3], scramble: "R", solution: "R'", autoplay: false });
 * console.log(value.plan?.solved);
 * ```
 */
export type CuboidPlayerHandle = {
  /** The solve as it was read, or why it could not be. */
  readonly plan: CuboidReplayPlan | null;
  readonly fault: CuboidReplayFault | null;
  /** Another solve on the same puzzle, in place of the one showing. The speed and the repeat are kept unless given. */
  load(
    source: CuboidReplaySource,
    how?: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean },
  ): void;
  play(): void;
  pause(): void;
  /** One step on (1) or back (-1). */
  step(by: 1 | -1): void;
  /** To the puzzle after this many steps. */
  seek(position: number): void;
  restart(): void;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
  setLocale(locale: KyuubuLanguage): void;
  setTheme(theme: CubeTheme): void;
  /** Whether moving the slider turns the puzzle between where it was and where it goes. */
  setAnimateScrub(on: boolean): void;
  /** Whether it does. */
  readonly animatingScrub: boolean;
  readonly status: ReplayStatus | null;
  /** The puzzle as drawn, for a page that wants to look at it. */
  readonly view: CuboidView;
  /** Take it off the page, with every listener. */
  destroy(): void;
};

const STYLE_ID = "kyuubu-cuboid-player-style";
/** The player's stylesheet, put in the page once: the cube player's, under the same class names and custom properties.
 *
 * @example
 * ```ts
 * import { CUBOID_PLAYER_CSS } from "@johnmorrisdotca/kyuubu/cuboid/play";
 *
 * console.log(CUBOID_PLAYER_CSS.includes("."));
 * ```
 */
export const CUBOID_PLAYER_CSS = `
.kyuubu-cuboid-player{display:grid;gap:.5rem;font:inherit;color:inherit;max-width:100%}
.kyuubu-cuboid-player-stage{aspect-ratio:1;width:100%;position:relative;background:var(--kyuubu-player-felt,transparent);border-radius:var(--kyuubu-player-radius,12px);touch-action:none}
.kyuubu-cuboid-player-row{display:flex;flex-wrap:wrap;gap:.375rem;align-items:center}
.kyuubu-cuboid-player button{touch-action:manipulation;font:inherit;color:inherit;min-height:44px;min-width:44px;padding:0 .75rem;border-radius:999px;border:1px solid var(--kyuubu-player-rule,color-mix(in srgb,currentColor 28%,transparent));background:var(--kyuubu-player-button,transparent);cursor:pointer}
.kyuubu-cuboid-player button[aria-pressed="true"],.kyuubu-cuboid-player button[data-main]{background:var(--kyuubu-player-ink,currentColor);border-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-cuboid-player button[aria-pressed="true"]>span,.kyuubu-cuboid-player button[data-main]>span{color:var(--kyuubu-player-paper,Canvas)}
.kyuubu-cuboid-player button:focus-visible,.kyuubu-cuboid-player input:focus-visible{outline:2px solid var(--kyuubu-player-focus,Highlight);outline-offset:2px}
.kyuubu-cuboid-player input[type=range]{flex:1 1 8rem;min-height:44px;accent-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-cuboid-player-at{font-variant-numeric:tabular-nums;font-size:.875em;opacity:.8;margin-inline-start:auto}
.kyuubu-cuboid-player-note{font-size:.8125em;opacity:.75;margin:0}
.kyuubu-cuboid-player-note[data-tone="bad"]{opacity:1;font-weight:600}
.kyuubu-cuboid-player-readout{display:flex;align-items:center;gap:.75rem;min-height:3.75rem}
.kyuubu-cuboid-player-code{flex:none;box-sizing:border-box;min-width:4.6ch;padding:.35rem .5rem;border-radius:12px;border:2px solid var(--kyuubu-player-ink,currentColor);font:700 2.25rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-ligatures:none;text-align:center}
.kyuubu-cuboid-player-says{display:grid;gap:.125rem;min-width:0;font-weight:600}
.kyuubu-cuboid-player-says small{min-height:1.25em;font-size:.8125rem;font-weight:400;opacity:.8}
.kyuubu-cuboid-player-live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;

export function addStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CUBOID_PLAYER_CSS;
  doc.head.append(style);
}

export const speedName = (speed: number) =>
  speed === 1 ? "1×" : speed === 0.5 ? "½×" : speed === 0.25 ? "¼×" : `${speed}×`;
