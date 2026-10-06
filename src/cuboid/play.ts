import { mountMoveList, type MoveListGroup, type MoveListHandle } from "../move-list.ts";
import { REPLAY_SPEEDS, Replay, type ReplayCube, type ReplayStatus } from "../replay.ts";
import type { CubeTheme } from "../view/view.ts";
import { WORDS, fill, languageOf, type CubeWords, type KyuubuLanguage } from "../words.ts";

import { CuboidView } from "./draw.ts";
import { isCuboidDims, solvedCuboid, type CuboidDims, type CuboidMove } from "./model.ts";
import { planCuboidReplay, type CuboidReplayFault, type CuboidReplayPlan, type CuboidReplaySource } from "./replay.ts";
import { CUBOID_WORDS, cuboidMoveName, faultSays } from "./words.ts";

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
.kyuubu-cuboid-player-readout{display:flex;align-items:center;gap:.75rem;min-height:3.75rem}
.kyuubu-cuboid-player-code{flex:none;box-sizing:border-box;min-width:4.6ch;padding:.35rem .5rem;border-radius:12px;border:2px solid var(--kyuubu-player-ink,currentColor);font:700 2.25rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-ligatures:none;text-align:center}
.kyuubu-cuboid-player-says{display:grid;gap:.125rem;min-width:0;font-weight:600}
.kyuubu-cuboid-player-says small{min-height:1.25em;font-size:.8125rem;font-weight:400;opacity:.8}
.kyuubu-cuboid-player-live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
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
  // Arrow keys step, Home and End go to the first and last move: from any button of the player.
  root.addEventListener("keydown", (event) => {
    if (replay === null || plan === null || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-kyuubu-moves]") !== null || target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return;
    const scramble = plan.scramble.length;
    const now = stateNow();
    let to: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") to = now + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = now - 1;
    else if (event.key === "Home") to = scramble + 1;
    else if (event.key === "End") to = scramble + plan.steps.length;
    if (to === null) return;
    event.preventDefault();
    goState(Math.max(1, to));
  });

  let plan: CuboidReplayPlan | null = null;
  let fault: CuboidReplayFault | null = null;
  // Dims that are not a cuboid are told to the person, under a 3×3×3 to stand in the place.
  const firstDims: CuboidDims = isCuboidDims(options.dims) ? options.dims : [3, 3, 3];
  // One puzzle for as long as the player lives, whatever solves it is given.
  const view = new CuboidView(stage, { dims: firstDims, theme: options.theme, locale: language, keyboard: "none", interactive: false });
  const cube: ReplayCube = {
    setState: (state) => view.setState(state),
    turnTogether: (moves, how) => view.turnTogether(moves as readonly CuboidMove[], how),
    get busy() {
      return view.busy;
    },
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
  let animateScrub = options.animateScrub !== false;
  /** The code of the move just made and what it turns; the list of moves; and the line a screen reader is told. */
  const readout = doc.createElement("div");
  readout.className = "kyuubu-cuboid-player-readout";
  readout.setAttribute("aria-hidden", "true");
  readout.dataset.kyuubuReadout = "";
  const codeBox = doc.createElement("span");
  codeBox.className = "kyuubu-cuboid-player-code";
  codeBox.dataset.kyuubuCode = "";
  const saysBox = doc.createElement("span");
  saysBox.className = "kyuubu-cuboid-player-says";
  const saysName = doc.createElement("span");
  saysName.dataset.kyuubuSays = "";
  const saysWhere = doc.createElement("small");
  saysWhere.dataset.kyuubuWhere = "";
  saysBox.append(saysName, saysWhere);
  readout.append(codeBox, saysBox);
  const live = doc.createElement("div");
  live.className = "kyuubu-cuboid-player-live";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  live.dataset.kyuubuLive = "";
  const listBox = doc.createElement("div");
  listBox.className = "kyuubu-cuboid-player-moves";
  let moves: MoveListHandle | null = null;
  let showReadout = false;
  let showList = false;
  let told = "";
  let quiet = true;
  let toldTimer: ReturnType<typeof setTimeout> | null = null;

  /** Where the replay stands along the scramble and the solve together: 0 on the solved puzzle, the scramble's length on the scrambled one. */
  const stateNow = () => {
    if (plan === null || replay === null) return 0;
    const scramble = plan.scramble.length;
    const status = replay.status;
    return status.scrambleAt < scramble ? status.scrambleAt : scramble + status.position;
  };
  /** The move that brought the replay to where it stands, or null on the solved puzzle. */
  const moveNow = () => {
    if (plan === null) return null;
    const at = stateNow() - 1;
    if (at < 0) return null;
    const scramble = plan.scramble.length;
    return at < scramble ? { step: plan.scramble[at], scramble: true, at: at + 1, total: scramble } : { step: plan.steps[at - scramble], scramble: false, at: at - scramble + 1, total: plan.steps.length };
  };
  const whereOf = (one: { scramble: boolean; at: number; total: number }) => say(one.scramble ? "playerScrambleOf" : "playerMoveOf", { at: one.at, total: one.total });
  /** What a screen reader is told of the move just made: at once when somebody chose it, and only once the puzzle has been still a moment when it is playing. */
  const announce = (text: string, playing: boolean) => {
    if (text === told) return;
    told = text;
    if (toldTimer !== null) clearTimeout(toldTimer);
    toldTimer = null;
    if (quiet) {
      quiet = false;
      return;
    }
    if (playing) toldTimer = setTimeout(() => (live.textContent = told), 350);
    else live.textContent = text;
  };
  const paintMoves = () => {
    if (replay === null || plan === null) return;
    const one = moveNow();
    const state = stateNow();
    if (showList) moves?.setCurrent(state === 0 ? null : state - 1);
    let heard: string;
    if (one === null) {
      codeBox.textContent = "–";
      saysName.textContent = say("playerBeforeScramble");
      saysWhere.textContent = "";
      heard = say("playerBeforeScramble");
    } else {
      const name = cuboidMoveName(one.step.text, language) ?? "";
      codeBox.textContent = one.step.text;
      saysName.textContent = name;
      saysWhere.textContent = one.scramble ? whereOf(one) : "";
      heard = say("playerHeard", { code: one.step.text, name, where: whereOf(one) });
    }
    root.dataset.code = one?.step.text ?? "";
    if (showReadout) announce(heard, replay.status.playing);
  };
  const listGroups = (): MoveListGroup[] => {
    if (plan === null) return [];
    const item = (step: { text: string }, scramble: boolean, at: number, total: number) => {
      const name = cuboidMoveName(step.text, language) ?? "";
      return { code: step.text, name, label: say("playerToken", { code: step.text, name, where: whereOf({ scramble, at, total }) }) };
    };
    const scramble = plan.scramble.length;
    return [
      { label: say("playerScrambleLabel"), items: plan.scramble.map((step, at) => item(step, true, at + 1, scramble)) },
      { label: say("playerSolutionLabel"), main: true, items: plan.steps.map((step, at) => item(step, false, at + 1, plan!.steps.length)) },
    ];
  };
  /** A move or a place chosen along the scramble and the solve together, by a press, a key or the slider: counted from the solved puzzle. */
  const goState = (state: number) => {
    if (replay === null || plan === null) return;
    const scramble = plan.scramble.length;
    const to = Math.max(0, Math.min(scramble + plan.steps.length, state));
    const now = stateNow();
    if (to === now) return;
    if (to === now + 1) replay.walk(1);
    else if (to === now - 1) replay.walk(-1);
    else if (to >= scramble) replay.seek(to - scramble, { animate: animateScrub });
    else replay.seekScramble(to);
  };

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
    paintMoves();
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
    showReadout = options.readout ?? how.controls !== false;
    showList = options.moveList ?? how.controls !== false;
    if (how.controls === false) {
      if (showReadout) root.append(readout);
      finish();
      return;
    }
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
    scrub.oninput = () => replay!.seek(Number(scrub.value), { animate: animateScrub });
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
    root.append(main, ...(showReadout ? [readout] : []), where, pace);
    finish();
  };

  /** The list under the controls, and the line a screen reader is told. */
  const finish = () => {
    if (showList) {
      root.append(listBox);
      moves = mountMoveList(listBox, { groups: listGroups(), locale: language, onPick: (index) => goState(index + 1) });
    }
    if (showReadout) root.append(live);
  };

  /** A solve put on the puzzle, in place of the one before. */
  const show = (source: CuboidReplaySource, how: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean }) => {
    replay?.destroy();
    replay = null;
    moves?.destroy();
    moves = null;
    showReadout = false;
    showList = false;
    quiet = true;
    told = "";
    live.textContent = "";
    if (toldTimer !== null) clearTimeout(toldTimer);
    toldTimer = null;
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
      moves?.setGroups(listGroups());
      quiet = true;
      paint();
    },
    setAnimateScrub: (on) => {
      animateScrub = on;
    },
    get animatingScrub() {
      return animateScrub;
    },
    setTheme: (theme) => view.setTheme(theme),
    get status() {
      return replay?.status ?? null;
    },
    view,
    destroy: () => {
      if (toldTimer !== null) clearTimeout(toldTimer);
      moves?.destroy();
      replay?.destroy();
      view.destroy();
      root.remove();
    },
  };
}
