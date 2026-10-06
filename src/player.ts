import { planReplay, Replay, REPLAY_SPEEDS, type ReplayFault, type ReplayPlan, type ReplaySource, type ReplayStatus } from "./replay.ts";
import { solvedCube } from "./cube.ts";
import { mountGuide, type GuideHandle } from "./guide-panel.ts";
import { mountMoveList, type MoveListGroup, type MoveListHandle } from "./move-list.ts";
import { moveName } from "./move-name.ts";
import { CubeView, type CubeTheme } from "./view/view.ts";
import { fill, languageOf, WORDS, type KyuubuLanguage } from "./words.ts";

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

/** How a player is set up: the solve, and how it is shown. */
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

/** A player on the page. */
export type PlayerHandle = {
  /** The solve as it was read, or why it could not be. */
  readonly plan: ReplayPlan | null;
  readonly fault: ReplayFault | null;
  /** Another solve on the same cube, in place of the one showing. The speed and the repeat are kept unless given. */
  load(source: ReplaySource, how?: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean; guide?: boolean }): void;
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
/** The player's stylesheet, put in the page once. */
export const PLAYER_CSS = `
.kyuubu-player{display:grid;gap:.5rem;font:inherit;color:inherit;max-width:100%}
.kyuubu-player-cube{aspect-ratio:1;width:100%;position:relative;background:var(--kyuubu-player-felt,transparent);border-radius:var(--kyuubu-player-radius,12px);touch-action:none}
.kyuubu-player-row{display:flex;flex-wrap:wrap;gap:.375rem;align-items:center}
.kyuubu-player button{touch-action:manipulation;font:inherit;color:inherit;min-height:44px;min-width:44px;padding:0 .75rem;border-radius:999px;border:1px solid var(--kyuubu-player-rule,color-mix(in srgb,currentColor 28%,transparent));background:var(--kyuubu-player-button,transparent);cursor:pointer}
.kyuubu-player button[aria-pressed="true"],.kyuubu-player button[data-main]{background:var(--kyuubu-player-ink,currentColor);border-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-player button[aria-pressed="true"]>span,.kyuubu-player button[data-main]>span{color:var(--kyuubu-player-paper,Canvas);mix-blend-mode:normal}
.kyuubu-player button:focus-visible,.kyuubu-player input:focus-visible{outline:2px solid var(--kyuubu-player-focus,Highlight);outline-offset:2px}
.kyuubu-player input[type=range]{flex:1 1 8rem;min-height:44px;accent-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-player-at{font-variant-numeric:tabular-nums;font-size:.875em;opacity:.8;margin-inline-start:auto}
.kyuubu-player-note{font-size:.8125em;opacity:.75;margin:0}
.kyuubu-player-note[data-tone="bad"]{opacity:1;font-weight:600}
.kyuubu-player-guide{padding:.25rem 0}
.kyuubu-player-credit{font-size:.75em;opacity:.7;color:inherit;margin-inline-start:auto}
.kyuubu-player-readout{display:flex;align-items:center;gap:.75rem;min-height:3.75rem}
.kyuubu-player-code{flex:none;box-sizing:border-box;min-width:4.6ch;padding:.35rem .5rem;border-radius:12px;border:2px solid var(--kyuubu-player-ink,currentColor);font:700 2.25rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-ligatures:none;text-align:center}
.kyuubu-player-says{display:grid;gap:.125rem;min-width:0;font-weight:600}
.kyuubu-player-says small{min-height:1.25em;font-size:.8125rem;font-weight:400;opacity:.8}
.kyuubu-player-live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;

function addStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PLAYER_CSS;
  doc.head.append(style);
}

const speedName = (speed: number) => (speed === 1 ? "1×" : speed === 0.5 ? "½×" : speed === 0.25 ? "¼×" : `${speed}×`);

/**
 * A solve drawn in an element, with its controls.
 *
 * @example
 * mountPlayer(document.getElementById("solve"), { scramble: "R U R' U'", solution: "U R U' R'", timeMs: 2000, autoplay: true });
 */
export function mountPlayer(host: HTMLElement, options: PlayerOptions): PlayerHandle {
  const doc = host.ownerDocument;
  addStyle(doc);
  let language: KyuubuLanguage = options.locale ?? languageOf(host.closest("[lang]")?.getAttribute("lang") ?? doc.documentElement.lang);
  const say = (key: keyof (typeof WORDS)["en"], values?: Record<string, string | number>) => fill(WORDS[language][key], values);

  const root = doc.createElement("div");
  root.className = "kyuubu-player";
  root.dataset.kyuubuPlayer = "";
  const stage = doc.createElement("div");
  stage.className = "kyuubu-player-cube";
  root.append(stage);
  host.replaceChildren(root);
  // Arrow keys step, Home and End go to the first and last move: from any button of the player, while the viewer is not turning the cube themselves.
  root.addEventListener("keydown", (event) => {
    if (replay === null || plan === null || follow !== null || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
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

  let plan: ReplayPlan | null = null;
  let fault: ReplayFault | null = null;
  // One cube for as long as the player lives, whatever solves it is given: a cube made afresh for each is a
  // second set of 3D layers before the first is let go, which a phone does not always have room for.
  const view = new CubeView(stage, { size: 3, theme: options.theme, locale: language, keyboard: "none", interactive: false });

  const button = (key: keyof (typeof WORDS)["en"], act: () => void, name: string) => {
    const el = doc.createElement("button");
    el.type = "button";
    el.dataset.act = name;
    const text = doc.createElement("span");
    el.append(text);
    el.addEventListener("click", act);
    return { el, text, key };
  };
  const note = doc.createElement("p");
  note.className = "kyuubu-player-note";
  let replay: Replay | null = null;
  let labelled: { el: HTMLElement; text: HTMLElement; key: keyof (typeof WORDS)["en"] }[] = [];
  const scrub = doc.createElement("input");
  const at = doc.createElement("span");
  at.className = "kyuubu-player-at";
  let speeds: HTMLButtonElement[] = [];
  let animateScrub = options.animateScrub !== false;
  /** The code of the move just made, and what it turns; the list of moves; and the line a screen reader is told. */
  const readout = doc.createElement("div");
  readout.className = "kyuubu-player-readout";
  readout.setAttribute("aria-hidden", "true");
  readout.dataset.kyuubuReadout = "";
  const codeBox = doc.createElement("span");
  codeBox.className = "kyuubu-player-code";
  codeBox.dataset.kyuubuCode = "";
  const saysBox = doc.createElement("span");
  saysBox.className = "kyuubu-player-says";
  const saysName = doc.createElement("span");
  saysName.dataset.kyuubuSays = "";
  const saysWhere = doc.createElement("small");
  saysWhere.dataset.kyuubuWhere = "";
  saysBox.append(saysName, saysWhere);
  readout.append(codeBox, saysBox);
  const live = doc.createElement("div");
  live.className = "kyuubu-player-live";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  live.dataset.kyuubuLive = "";
  const listBox = doc.createElement("div");
  listBox.className = "kyuubu-player-moves";
  let moves: MoveListHandle | null = null;
  let showReadout = false;
  let showList = false;
  let told = "";
  let quiet = true;
  let toldTimer: ReturnType<typeof setTimeout> | null = null;
  let playButton: ReturnType<typeof button> | null = null;
  let loopButton: ReturnType<typeof button> | null = null;
  let followButton: ReturnType<typeof button> | null = null;
  const guideBox = doc.createElement("div");
  guideBox.className = "kyuubu-player-guide";
  /** The viewer's own turns: the guide, and the step of the solve it started from. */
  let follow: { panel: GuideHandle; from: number } | null = null;
  const followed = () => (follow === null ? null : Math.min(plan?.steps.length ?? 0, follow.from + follow.panel.guide.done));

  /** The cube handed to the viewer, from where the solve stands, with its next move shown on it. */
  const startFollow = () => {
    if (follow !== null || replay === null || plan === null) return;
    replay.pause();
    const from = replay.status.position;
    view.setState(plan.states[from], plan.size);
    view.setInteractive(true);
    root.append(guideBox);
    const panel = mountGuide(guideBox, view, { moves: plan.steps.slice(from), locale: language, onChange: () => paint() });
    follow = { panel, from };
    paint();
  };
  /** The cube taken back to be played, at the step the viewer reached; any turn of their own that was not the solve's is let go. */
  const stopFollow = () => {
    if (follow === null) return;
    const reached = followed()!;
    follow.panel.destroy();
    follow = null;
    guideBox.remove();
    view.setInteractive(false);
    replay?.seek(reached);
    paint();
  };
  /** A control of the replay, pressed while the viewer is turning the cube: first the cube is taken back. */
  const played = (act: () => void) => () => {
    stopFollow();
    act();
  };

  /** Where the replay stands along the scramble and the solve together: 0 on the solved cube, the scramble's length on the scrambled one, and the whole of both at the end. */
  const stateNow = () => {
    if (plan === null || replay === null) return 0;
    const scramble = plan.scramble.length;
    const status = replay.status;
    return status.scrambleAt < scramble ? status.scrambleAt : scramble + (followed() ?? status.position);
  };
  /** The move that brought the replay to where it stands, or null on the solved cube. */
  const moveNow = () => {
    if (plan === null) return null;
    const at = stateNow() - 1;
    if (at < 0) return null;
    const scramble = plan.scramble.length;
    return at < scramble ? { step: plan.scramble[at], scramble: true, at: at + 1, total: scramble } : { step: plan.steps[at - scramble], scramble: false, at: at - scramble + 1, total: plan.steps.length };
  };
  const whereOf = (one: { scramble: boolean; at: number; total: number }) => say(one.scramble ? "playerScrambleOf" : "playerMoveOf", { at: one.at, total: one.total });
  /** What a screen reader is told of the move just made: at once when somebody chose it, and only once the cube has been still a moment when it is playing. */
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
      const name = moveName(one.step.text, language) ?? "";
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
      const name = moveName(step.text, language) ?? "";
      return { code: step.text, name, label: say("playerToken", { code: step.text, name, where: whereOf({ scramble, at, total }) }) };
    };
    const scramble = plan.scramble.length;
    return [
      { label: say("playerScrambleLabel"), items: plan.scramble.map((step, at) => item(step, true, at + 1, scramble)) },
      { label: say("playerSolutionLabel"), main: true, items: plan.steps.map((step, at) => item(step, false, at + 1, plan!.steps.length)) },
    ];
  };

  /** A move or a place chosen along the scramble and the solve together, by a press, a key or the slider: counted from the solved cube, so that the scrambled one is the scramble's length. */
  const goState = (state: number) => {
    if (replay === null || plan === null) return;
    const scramble = plan.scramble.length;
    const total = scramble + plan.steps.length;
    const to = Math.max(0, Math.min(total, state));
    const now = stateNow();
    if (to === now) return;
    if (to === now + 1) replay.walk(1);
    else if (to === now - 1) replay.walk(-1);
    else if (to >= scramble) replay.seek(to - scramble, { animate: animateScrub });
    else replay.seekScramble(to);
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
    if (followButton !== null) followButton.el.setAttribute("aria-pressed", String(follow !== null));
    root.dataset.following = String(follow !== null);
    for (const one of speeds) one.setAttribute("aria-pressed", String(Number(one.dataset.speed) === status?.speed));
    if (status !== null) {
      const position = followed() ?? status.position;
      root.dataset.position = String(position);
      scrub.max = String(status.total);
      scrub.value = String(position);
      scrub.setAttribute("aria-label", say("playerScrub"));
      at.textContent = say("playerMoveOf", { at: position, total: status.total });
    }
    paintMoves();
    if (fault !== null) {
      note.dataset.tone = "bad";
      const where = fault.fault;
      note.textContent = where === undefined ? say("playerTooLong") : say(where.reason === "no-such-layer" ? "playerNoSuchLayer" : "playerCannotRead", { token: where.token, line: where.line, column: where.column });
    } else if (plan !== null && !plan.solved) {
      note.dataset.tone = "bad";
      note.textContent = say("playerUnsolved");
    } else if (plan !== null && plan.pace === "spread") {
      note.dataset.tone = "";
      note.textContent = say("playerEvenPace", { time: (plan.totalMs / 1000).toFixed(2) });
    } else note.textContent = "";
    note.hidden = note.textContent === "";
  };

  /** A solve put on the cube, in place of the one before. */
  const show = (source: ReplaySource, how: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean; guide?: boolean }) => {
    if (follow !== null) {
      follow.panel.destroy();
      follow = null;
      guideBox.remove();
      view.setInteractive(false);
    }
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
    followButton = null;
    root.replaceChildren(stage);
    const planned = planReplay(source);
    plan = planned.ok ? planned.plan : null;
    fault = planned.ok ? null : planned.fault;
    if (plan === null) view.setState(solvedCube(3), 3);
    else build(plan, how);
    root.append(note);
    paint();
    if (plan !== null && how.guide === true) startFollow();
    else if (plan !== null && how.autoplay === true) replay!.play();
  };

  const build = (plan: ReplayPlan, how: { speed?: number; loop?: boolean; controls?: boolean }) => {
    replay = new Replay(view, plan, {
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
    if (how.controls !== false) {
      const main = doc.createElement("div");
      main.className = "kyuubu-player-row";
      const again = button("playerAgain", played(() => replay!.restart()), "again");
      const back = button("playerBack", played(() => replay!.step(-1)), "back");
      playButton = button("playerPlay", played(() => (replay!.status.playing ? replay!.pause() : replay!.play())), "play");
      playButton.el.dataset.main = "";
      const on = button("playerOn", played(() => replay!.step(1)), "on");
      labelled.push(again, back, on);
      main.append(playButton.el, back.el, on.el, again.el);
      scrub.type = "range";
      scrub.min = "0";
      scrub.step = "1";
      scrub.oninput = () => {
        stopFollow();
        replay!.seek(Number(scrub.value), { animate: animateScrub });
      };
      const where = doc.createElement("div");
      where.className = "kyuubu-player-row";
      where.append(scrub, at);

      const pace = doc.createElement("div");
      pace.className = "kyuubu-player-row";
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
      loopButton = button("playerLoop", () => replay!.setLoop(!replay!.status.loop), "loop");
      followButton = button("playerFollow", () => (follow === null ? startFollow() : stopFollow()), "follow");
      labelled.push(loopButton, followButton);
      pace.append(loopButton.el, followButton.el);
      root.append(main, ...(showReadout ? [readout] : []), where, pace);
    } else if (showReadout) root.append(readout);
    if (showList) {
      root.append(listBox);
      moves = mountMoveList(listBox, { groups: listGroups(), locale: language, onPick: (index) => played(() => goState(index + 1))() });
    }
    if (showReadout) root.append(live);
  };
  show(options, options);

  return {
    get plan() {
      return plan;
    },
    get fault() {
      return fault;
    },
    load: (source, how = {}) => show(source, { speed: how.speed ?? replay?.status.speed, loop: how.loop ?? replay?.status.loop, controls: how.controls ?? options.controls, autoplay: how.autoplay, guide: how.guide }),
    play: played(() => replay?.play()),
    pause: played(() => replay?.pause()),
    step: (by) => played(() => replay?.step(by))(),
    seek: (position) => played(() => replay?.seek(position))(),
    restart: played(() => replay?.restart()),
    setSpeed: (speed) => replay?.setSpeed(speed),
    setLoop: (loop) => replay?.setLoop(loop),
    setAnimateScrub: (on) => {
      animateScrub = on;
    },
    get animatingScrub() {
      return animateScrub;
    },
    setLocale: (locale) => {
      language = locale;
      view.setLocale(locale);
      follow?.panel.setLocale(locale);
      moves?.setGroups(listGroups());
      quiet = true;
      paint();
    },
    follow: (on) => (on ? startFollow() : stopFollow()),
    get following() {
      return follow !== null;
    },
    setTheme: (theme) => view.setTheme(theme),
    get status() {
      return replay?.status ?? null;
    },
    destroy: () => {
      if (toldTimer !== null) clearTimeout(toldTimer);
      moves?.destroy();
      follow?.panel.destroy();
      replay?.destroy();
      view.destroy();
      root.remove();
    },
  };
}
