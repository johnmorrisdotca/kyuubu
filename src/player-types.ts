import type { Cloth } from "./cloth.ts";
import { PLAYER_CSS } from "./player.data.ts";
import type { ReplayFault, ReplayPlan, ReplaySource, ReplayStatus } from "./replay.ts";
import type { CubeTheme } from "./view/view.ts";
import type { KyuubuLanguage } from "./words.ts";

/**
 * A SOLVE ON A PAGE: a cube, and under it the few controls a person needs to
 * watch a solve: play and pause, a step either way, from the start, where in
 * the solve, how fast, and whether to repeat. `mountPlayer` draws it in an
 * element; the custom element and the embed page are this and nothing more.
 *
 * The viewer can drag to look round the cube, and cannot turn its layers:
 * the solve is someone's, and is shown as it was. Until they ask to turn it
 * themselves ("Turn it yourself", or `guide`): then the cube is theirs, the
 * solve's next move is shown on it with an arrow, and each move they make
 * brings the next. It is drawn in the page's own document (no shadow root), takes the page's
 * font and text colour, and everything it colours is a CSS custom property
 * beginning `--kyuubu-player-`, so a page can dress it.
 */

/** How a player is set up: the solve, and how it is shown.
 *
 * @example
 * ```ts
 * import type { PlayerOptions } from "@johnmorrisdotca/kyuubu/player";
 *
 *
 * const value: PlayerOptions = { size: 3, scramble: "R", solution: "R'", autoplay: false };
 * console.log(value.size);
 * ```
 */
export type PlayerOptions = ReplaySource & {
  /** Start playing as soon as it is drawn. */
  autoplay?: boolean;
  /** Begin again when it ends. */
  loop?: boolean;
  /** Show the controls: true unless said otherwise. A cube with none still plays when `autoplay` is set. */
  controls?: boolean;
  /** The speed it starts at: 1 is the solve's own pace. */
  speed?: number;
  /** The cube's colours. */
  theme?: CubeTheme;
  /** The cloth the stage behind the cube is laid in: "green", "blue", "red", "black" or "wood", the family's five. With none, the stage is clear. */
  cloth?: Cloth;
  /** Start with the cube for the viewer to turn themselves, the solve's next move shown on it, rather than played for them. */
  guide?: boolean;
  /** Show the code of the move just made in large type, with what it turns in words, and say it to a screen reader as it changes. True unless said otherwise; with `controls: false`, off unless this says true. */
  readout?: boolean;
  /** Show the moves as buttons, the one just made marked and scrolled into view, each one taking the replay to it. True unless said otherwise; with `controls: false`, off unless this says true. */
  moveList?: boolean;
  /** Whether moving the slider, or choosing a move, turns the cube between where it was and where it goes: forwards going on, each turn undone going back, a long jump catching up at once. True unless said otherwise. */
  animateScrub?: boolean;
  /** English or Japanese; the page's `lang` when left out. */
  locale?: KyuubuLanguage;
  /** Called after every step, and whenever it starts, stops or is moved. */
  onChange?: (status: ReplayStatus) => void;
  /** Called each time the end is reached. */
  onEnd?: () => void;
};

/** A player on the page.
 *
 * @example
 * ```ts no-run
 * import type { PlayerHandle } from "@johnmorrisdotca/kyuubu/player";
 * import { mountPlayer } from "@johnmorrisdotca/kyuubu/player";
 *
 * const value: PlayerHandle = mountPlayer(document.createElement("div"), { scramble: "R", solution: "R'", autoplay: false });
 * console.log(value.plan?.solved);
 * ```
 */
export type PlayerHandle = {
  /** The solve as it was read, or why it could not be. */
  readonly plan: ReplayPlan | null;
  readonly fault: ReplayFault | null;
  /** Another solve on the same cube, in place of the one showing. The speed and the repeat are kept unless given. */
  load(
    source: ReplaySource,
    how?: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean; guide?: boolean },
  ): void;
  play(): void;
  pause(): void;
  /** One step on (1) or back (-1). */
  step(by: 1 | -1): void;
  /** To the cube after this many steps. */
  seek(position: number): void;
  restart(): void;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
  setLocale(locale: KyuubuLanguage): void;
  setTheme(theme: CubeTheme): void;
  /** Whether moving the slider turns the cube between where it was and where it goes. */
  setAnimateScrub(on: boolean): void;
  /** Whether it does. */
  readonly animatingScrub: boolean;
  /** Hand the cube to the viewer to turn, the next move shown on it (true), or take it back to be played (false). */
  follow(on: boolean): void;
  /** Whether the viewer is turning it themselves. */
  readonly following: boolean;
  readonly status: ReplayStatus | null;
  /** Take it off the page, with every listener. */
  destroy(): void;
};

const STYLE_ID = "kyuubu-player-style";

export function addStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PLAYER_CSS;
  doc.head.append(style);
}

export const speedName = (speed: number) =>
  speed === 1 ? "1×" : speed === 0.5 ? "½×" : speed === 0.25 ? "¼×" : `${speed}×`;
