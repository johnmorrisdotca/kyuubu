import { planReplay, Replay, REPLAY_SPEEDS, type ReplayFault, type ReplayPlan, type ReplaySource, type ReplayStatus } from "./replay.ts";
import { solvedCube } from "./cube.ts";
import { CubeView, type CubeTheme } from "./view/view.ts";
import { fill, languageOf, WORDS, type KyuubuLanguage } from "./words.ts";

/**
 * A SOLVE ON A PAGE: a cube, and under it the few controls a person needs to
 * watch a solve: play and pause, a step either way, from the start, where in
 * the solve, how fast, and whether to repeat. `mountPlayer` draws it in an
 * element; the custom element and the embed page are this and nothing more.
 *
 * The viewer can drag to look round the cube, and cannot turn its layers:
 * the solve is someone's, and is shown as it was. It is drawn in the page's own document (no shadow root), takes the page's
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
  load(source: ReplaySource, how?: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean }): void;
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
.kyuubu-player button{font:inherit;color:inherit;min-height:44px;min-width:44px;padding:0 .75rem;border-radius:999px;border:1px solid var(--kyuubu-player-rule,color-mix(in srgb,currentColor 28%,transparent));background:var(--kyuubu-player-button,transparent);cursor:pointer}
.kyuubu-player button[aria-pressed="true"],.kyuubu-player button[data-main]{background:var(--kyuubu-player-ink,currentColor);border-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-player button[aria-pressed="true"]>span,.kyuubu-player button[data-main]>span{color:var(--kyuubu-player-paper,Canvas);mix-blend-mode:normal}
.kyuubu-player button:focus-visible,.kyuubu-player input:focus-visible{outline:2px solid var(--kyuubu-player-focus,Highlight);outline-offset:2px}
.kyuubu-player input[type=range]{flex:1 1 8rem;min-height:44px;accent-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-player-at{font-variant-numeric:tabular-nums;font-size:.875em;opacity:.8;margin-inline-start:auto}
.kyuubu-player-note{font-size:.8125em;opacity:.75;margin:0}
.kyuubu-player-note[data-tone="bad"]{opacity:1;font-weight:600}
.kyuubu-player-credit{font-size:.75em;opacity:.7;color:inherit;margin-inline-start:auto}
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
  let playButton: ReturnType<typeof button> | null = null;
  let loopButton: ReturnType<typeof button> | null = null;

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
  const show = (source: ReplaySource, how: { speed?: number; loop?: boolean; controls?: boolean; autoplay?: boolean }) => {
    replay?.destroy();
    replay = null;
    labelled = [];
    speeds = [];
    playButton = null;
    loopButton = null;
    root.replaceChildren(stage);
    const planned = planReplay(source);
    plan = planned.ok ? planned.plan : null;
    fault = planned.ok ? null : planned.fault;
    if (plan === null) view.setState(solvedCube(3), 3);
    else build(plan, how);
    root.append(note);
    paint();
    if (plan !== null && how.autoplay === true) replay!.play();
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
    if (how.controls !== false) {
      const main = doc.createElement("div");
      main.className = "kyuubu-player-row";
      const again = button("playerAgain", () => replay!.restart(), "again");
      const back = button("playerBack", () => replay!.step(-1), "back");
      playButton = button("playerPlay", () => (replay!.status.playing ? replay!.pause() : replay!.play()), "play");
      playButton.el.dataset.main = "";
      const on = button("playerOn", () => replay!.step(1), "on");
      labelled.push(again, back, on);
      main.append(playButton.el, back.el, on.el, again.el);
      scrub.type = "range";
      scrub.min = "0";
      scrub.step = "1";
      scrub.addEventListener("input", () => replay!.seek(Number(scrub.value)));
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
      labelled.push(loopButton);
      pace.append(loopButton.el);
      root.append(main, where, pace);
    }
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
    destroy: () => {
      replay?.destroy();
      view.destroy();
      root.remove();
    },
  };
}
