import { REPLAY_SPEEDS, Replay, type ReplayCube, type ReplayStatus } from "../replay.ts";
import type { CubeTheme } from "../view/view.ts";
import { WORDS, fill, languageOf, type CubeWords, type KyuubuLanguage } from "../words.ts";

import { CuboidView } from "./draw.ts";
import { isCuboidDims, solvedCuboid, type CuboidDims, type CuboidMove } from "./model.ts";
import { planCuboidReplay, type CuboidReplayFault, type CuboidReplayPlan, type CuboidReplaySource } from "./replay.ts";
import { CUBOID_WORDS, faultSays } from "./words.ts";

/**
 * A SOLVE ON A CUBOID ON A PAGE: the puzzle, and under it the few controls a
 * person needs to watch a solve: play and pause, a step either way, from the
 * start, where in the solve, how fast, and whether to repeat. `mountCuboidPlayer`
 * draws it in an element; the custom element is this and nothing more. As on
 * the cube's player (`player.ts`), whose classes and `--kyuubu-player-*`
 * custom properties it wears, the viewer can drag to look round the puzzle and
 * cannot turn its layers: the solve is someone's, and is shown as it was.
 */

/** How a cuboid player is set up: the solve, and how it is shown. */
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
  /** English or Japanese; the page's `lang` when left out. */
  locale?: KyuubuLanguage;
  /** Called after every step, and whenever it starts, stops or is moved. */
  onChange?: (status: ReplayStatus) => void;
  /** Called each time the end is reached. */
  onEnd?: () => void;
};

/** A cuboid player on the page. */
export type CuboidPlayerHandle = {
  /** The solve as it was read, or why it could not be. */
  readonly plan: CuboidReplayPlan | null;
  readonly fault: CuboidReplayFault | null;
  /** Another solve on the same puzzle, in place of the one showing. The speed and the repeat are kept unless given. */
  load(source: CuboidReplaySource, how?: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean }): void;
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
  readonly status: ReplayStatus | null;
  /** The puzzle as drawn, for a page that wants to look at it. */
  readonly view: CuboidView;
  /** Take it off the page, with every listener. */
  destroy(): void;
};

const STYLE_ID = "kyuubu-cuboid-player-style";
/** The player's stylesheet, put in the page once: the cube player's, under the same class names and custom properties. */
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
`;

function addStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CUBOID_PLAYER_CSS;
  doc.head.append(style);
}

const speedName = (speed: number) => (speed === 1 ? "1×" : speed === 0.5 ? "½×" : speed === 0.25 ? "¼×" : `${speed}×`);

/**
 * A solve on a cuboid drawn in an element, with its controls.
 *
 * @example
 * mountCuboidPlayer(document.getElementById("solve"), { dims: [3, 3, 1], scramble: "U2 R2", solution: "R2 U2", timeMs: 2000, autoplay: true });
 */
export function mountCuboidPlayer(host: HTMLElement, options: CuboidPlayerOptions): CuboidPlayerHandle {
  const doc = host.ownerDocument;
  addStyle(doc);
  let language: KyuubuLanguage = options.locale ?? languageOf(host.closest("[lang]")?.getAttribute("lang") ?? doc.documentElement.lang);
  const say = (key: keyof CubeWords, values?: Record<string, string | number>) => fill(WORDS[language][key], values);

  const root = doc.createElement("div");
  root.className = "kyuubu-cuboid-player";
  root.dataset.kyuubuCuboidPlayer = "";
  const stage = doc.createElement("div");
  stage.className = "kyuubu-cuboid-player-stage";
  root.append(stage);
  host.replaceChildren(root);

  let plan: CuboidReplayPlan | null = null;
  let fault: CuboidReplayFault | null = null;
  // Dims that are not a cuboid are told to the person, under a 3×3×3 to stand in the place.
  const firstDims: CuboidDims = isCuboidDims(options.dims) ? options.dims : [3, 3, 3];
  // One puzzle for as long as the player lives, whatever solves it is given.
  const view = new CuboidView(stage, { dims: firstDims, theme: options.theme, locale: language, keyboard: "none", interactive: false });
  const cube: ReplayCube = {
    setState: (state) => view.setState(state),
    turnTogether: (moves, how) => view.turnTogether(moves as readonly CuboidMove[], how),
  };

  const note = doc.createElement("p");
  note.className = "kyuubu-cuboid-player-note";
  let replay: Replay | null = null;
  let labelled: { text: HTMLElement; key: keyof CubeWords }[] = [];
  const scrub = doc.createElement("input");
  const at = doc.createElement("span");
  at.className = "kyuubu-cuboid-player-at";
  let speeds: HTMLButtonElement[] = [];
  let playButton: { el: HTMLButtonElement; text: HTMLElement } | null = null;
  let loopButton: { el: HTMLButtonElement } | null = null;

  const button = (key: keyof CubeWords, act: () => void, name: string) => {
    const el = doc.createElement("button");
    el.type = "button";
    el.dataset.act = name;
    const text = doc.createElement("span");
    el.append(text);
    el.addEventListener("click", act);
    return { el, text, key };
  };

  const paint = () => {
    root.dataset.lang = language;
    for (const one of labelled) one.text.textContent = say(one.key);
    const status = replay?.status ?? null;
    root.dataset.playing = String(status?.playing === true);
    root.dataset.position = String(status?.position ?? 0);
    root.dataset.ended = String(status?.ended === true);
    if (playButton !== null) {
      playButton.text.textContent = say(status?.playing === true ? "playerPause" : "playerPlay");
      playButton.el.dataset.act = status?.playing === true ? "pause" : "play";
    }
    if (loopButton !== null) loopButton.el.setAttribute("aria-pressed", String(status?.loop === true));
    for (const one of speeds) one.setAttribute("aria-pressed", String(Number(one.dataset.speed) === status?.speed));
    if (status !== null) {
      scrub.max = String(status.total);
      scrub.value = String(status.position);
      scrub.setAttribute("aria-label", say("playerScrub"));
      at.textContent = say("playerMoveOf", { at: status.position, total: status.total });
    }
    if (fault !== null) {
      note.dataset.tone = "bad";
      note.textContent =
        fault.part === "dims" ? CUBOID_WORDS[language].faultDims : fault.part === "length" || fault.fault === undefined ? CUBOID_WORDS[language].faultLength : faultSays(fault.fault, fault.token ?? "", language);
    } else if (plan !== null && !plan.solved) {
      note.dataset.tone = "bad";
      note.textContent = say("playerUnsolved");
    } else if (plan !== null && plan.pace === "spread") {
      note.dataset.tone = "";
      note.textContent = say("playerEvenPace", { time: (plan.totalMs / 1000).toFixed(2) });
    } else note.textContent = "";
    note.hidden = note.textContent === "";
  };

  const build = (made: CuboidReplayPlan, how: { speed?: number; loop?: boolean; controls?: boolean }) => {
    replay = new Replay(cube, made, {
      speed: how.speed,
      loop: how.loop,
      onChange: (status) => {
        paint();
        options.onChange?.(status);
      },
      onEnd: options.onEnd,
    });
    if (how.controls === false) return;
    const main = doc.createElement("div");
    main.className = "kyuubu-cuboid-player-row";
    const again = button("playerAgain", () => replay!.restart(), "again");
    const back = button("playerBack", () => replay!.step(-1), "back");
    const play = button("playerPlay", () => (replay!.status.playing ? replay!.pause() : replay!.play()), "play");
    play.el.dataset.main = "";
    playButton = play;
    const on = button("playerOn", () => replay!.step(1), "on");
    labelled.push(again, back, on);
    main.append(play.el, back.el, on.el, again.el);
    scrub.type = "range";
    scrub.min = "0";
    scrub.step = "1";
    scrub.oninput = () => replay!.seek(Number(scrub.value));
    const where = doc.createElement("div");
    where.className = "kyuubu-cuboid-player-row";
    where.append(scrub, at);
    const pace = doc.createElement("div");
    pace.className = "kyuubu-cuboid-player-row";
    pace.setAttribute("role", "group");
    for (const speed of REPLAY_SPEEDS) {
      const el = doc.createElement("button");
      el.type = "button";
      el.dataset.speed = String(speed);
      el.dataset.act = "speed";
      const text = doc.createElement("span");
      text.textContent = speedName(speed);
      el.append(text);
      el.addEventListener("click", () => replay!.setSpeed(speed));
      speeds.push(el);
      pace.append(el);
    }
    const loop = button("playerLoop", () => replay!.setLoop(!replay!.status.loop), "loop");
    loopButton = loop;
    labelled.push(loop);
    pace.append(loop.el);
    root.append(main, where, pace);
  };

  /** A solve put on the puzzle, in place of the one before. */
  const show = (source: CuboidReplaySource, how: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean }) => {
    replay?.destroy();
    replay = null;
    labelled = [];
    speeds = [];
    playButton = null;
    loopButton = null;
    root.replaceChildren(stage);
    const planned = planCuboidReplay(source);
    plan = planned.ok ? planned.plan : null;
    fault = planned.ok ? null : planned.fault;
    if (plan === null) view.setState(solvedCuboid(view.dims));
    else {
      view.setState(plan.start, plan.dims);
      build(plan, how);
    }
    root.append(note);
    paint();
    if (plan !== null && how.autoplay === true) replay!.play();
  };
  show(options, options);

  return {
    get plan() {
      return plan;
    },
    get fault() {
      return fault;
    },
    load: (source, how = {}) => show(source, { speed: how.speed ?? replay?.status.speed, loop: how.loop ?? replay?.status.loop, controls: how.controls ?? options.controls, autoplay: how.autoplay }),
    play: () => replay?.play(),
    pause: () => replay?.pause(),
    step: (by) => replay?.step(by),
    seek: (position) => replay?.seek(position),
    restart: () => replay?.restart(),
    setSpeed: (speed) => replay?.setSpeed(speed),
    setLoop: (loop) => replay?.setLoop(loop),
    setLocale: (locale) => {
      language = locale;
      view.setLocale(locale);
      paint();
    },
    setTheme: (theme) => view.setTheme(theme),
    get status() {
      return replay?.status ?? null;
    },
    view,
    destroy: () => {
      replay?.destroy();
      view.destroy();
      root.remove();
    },
  };
}
