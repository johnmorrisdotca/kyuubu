import { cubeSolved, undoOf } from "./cube.ts";
import { Guide, movementSays, movementText, rotationKeys, type GuideHeard, type GuideSource } from "./guide.ts";
import { movesNotation } from "./notation.ts";
import type { CubeMove } from "./types.ts";
import type { CubeView } from "./view/view.ts";
import { WORDS, fill, languageOf, stageName, stageSays, type CubeWords, type KyuubuLanguage } from "./words.ts";

/**
 * THE GUIDE BESIDE A CUBE: the next movement in notation and in words, how
 * to make it with a hand, and the arrow for it on the cube itself. It hears
 * every turn the person makes on the cube and moves on; a turn it did not ask
 * for is said to be one, with a button to take it back and an arrow on the
 * cube for turning it back by hand. A turn of the whole cube, which no drag
 * makes, has a button that makes it, and the keys that do.
 *
 * It is drawn in the page's own document, takes the page's font and colour,
 * and everything it colours is a custom property beginning `--kyuubu-guide-`.
 */

/** How a guide beside a cube is set up: what it walks, and how it speaks. */
export type GuidePanelOptions = GuideSource & {
  /** English or Japanese; the page's `lang` when left out. */
  locale?: KyuubuLanguage;
  /** Called whenever what it shows changes: after every turn it hears (with what it made of it), and when it takes a turn back or makes one. */
  onChange?: (guide: Guide, heard: GuideHeard | null) => void;
  /** Called once, when the last movement has been made. */
  onEnd?: () => void;
};

/** A guide beside a cube, on the page. */
export type GuideHandle = {
  /** The guide it shows: what is next, what has been done, any detour. */
  readonly guide: Guide;
  /** Every detour taken back, on the cube. */
  takeBack(): void;
  /** The next movement made for the person, on the cube, after taking back any detour. */
  makeNext(): void;
  /** Another list or the method, from the cube as it is now. */
  load(source: GuideSource): void;
  setLocale(locale: KyuubuLanguage): void;
  /** Take it off the page, and the hint off the cube. The cube stays as it is. */
  destroy(): void;
};

const STYLE_ID = "kyuubu-guide-style";
/** The guide's stylesheet, put in the page once. */
export const GUIDE_CSS = `
.kyuubu-guide{display:grid;gap:.3rem;font:inherit;color:inherit;max-width:100%}
.kyuubu-guide p{margin:0}
.kyuubu-guide-move{display:flex;align-items:baseline;gap:.75rem;flex-wrap:wrap}
.kyuubu-guide-move b{font:700 1.6em/1.1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--kyuubu-guide-ink,inherit)}
.kyuubu-guide-at{font-size:.85em;opacity:.75;margin-inline-start:auto;font-variant-numeric:tabular-nums}
.kyuubu-guide-stage{font-size:.875em;opacity:.8}
.kyuubu-guide-says{font-weight:600}
.kyuubu-guide-how{font-size:.875em;opacity:.8}
.kyuubu-guide-off{font-size:.875em;font-weight:700;color:var(--kyuubu-guide-alert,inherit)}
.kyuubu-guide-row{display:flex;flex-wrap:wrap;gap:.375rem}
.kyuubu-guide button{touch-action:manipulation;font:inherit;color:inherit;min-height:44px;min-width:44px;padding:0 .9rem;border-radius:999px;border:1px solid var(--kyuubu-guide-rule,color-mix(in srgb,currentColor 28%,transparent));background:var(--kyuubu-guide-button,transparent);cursor:pointer}
.kyuubu-guide button:focus-visible{outline:2px solid var(--kyuubu-guide-focus,Highlight);outline-offset:2px}
.kyuubu-guide [hidden]{display:none!important}
`;

function addStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = GUIDE_CSS;
  doc.head.append(style);
}

/**
 * A guide drawn in an element, for the cube in `view`: the view shows the
 * hint, and a person makes each movement on it. The view must let a person
 * turn it (`interactive`).
 *
 * @example
 * const view = new CubeView(cubeElement, { size: 3, state });
 * mountGuide(guideElement, view, { method: true });
 */
export function mountGuide(host: HTMLElement, view: CubeView, options: GuidePanelOptions): GuideHandle {
  const doc = host.ownerDocument;
  addStyle(doc);
  let language: KyuubuLanguage = options.locale ?? languageOf(host.closest("[lang]")?.getAttribute("lang") ?? doc.documentElement.lang);
  const say = (key: keyof CubeWords, values?: Record<string, string | number>) => fill(WORDS[language][key], values);
  let guide = new Guide(view.state, view.size, options);
  let ended = false;

  const root = doc.createElement("div");
  root.className = "kyuubu-guide";
  root.dataset.kyuubuGuide = "";
  root.setAttribute("role", "group");
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const el = doc.createElement(tag);
    el.className = className;
    return el;
  };
  const stage = make("p", "kyuubu-guide-stage");
  const line = make("p", "kyuubu-guide-move");
  const notation = doc.createElement("b");
  notation.dataset.guide = "move";
  const at = make("span", "kyuubu-guide-at");
  line.append(notation, at);
  const says = make("p", "kyuubu-guide-says");
  says.setAttribute("aria-live", "polite");
  says.dataset.guide = "says";
  const how = make("p", "kyuubu-guide-how");
  how.dataset.guide = "how";
  const off = make("p", "kyuubu-guide-off");
  off.dataset.guide = "off";
  off.setAttribute("role", "alert");
  const row = make("div", "kyuubu-guide-row");
  const button = (act: string, run: () => void) => {
    const el = doc.createElement("button");
    el.type = "button";
    el.dataset.act = act;
    el.addEventListener("click", run);
    return el;
  };
  // The guide's own turns are made on the cube as a person's would be, so a page counting turns counts them; the guide does not hear them again.
  let making = false;
  const turn = (moves: readonly CubeMove[]) => {
    making = true;
    try {
      for (const move of moves) view.turn(move, { report: true });
    } finally {
      making = false;
    }
  };
  const back = button("take-back", () => {
    turn(guide.takeBack());
    paint(null);
  });
  const doIt = button("do-it", () => {
    turn(guide.makeNext());
    paint("done");
  });
  row.append(back, doIt);
  root.append(stage, line, says, how, off, row);
  host.replaceChildren(root);

  let spoken = "";
  const paint = (heard: GuideHeard | null) => {
    root.setAttribute("aria-label", say("guideLabel"));
    root.dataset.lang = language;
    back.textContent = say("guideTakeBack");
    doIt.textContent = say("guideDoIt");
    const next = guide.next;
    const detours = guide.detours;
    root.dataset.state = next === null ? "done" : detours.length > 0 ? "off" : "on";
    root.dataset.done = String(guide.done);
    stage.hidden = next?.stage === undefined;
    if (next?.stage !== undefined) stage.textContent = `${stageName(next.stage, language)} · ${stageSays(next.stage, language)}`;
    // The hint on the cube: the way back from a detour, or the movement to make.
    const last = detours.at(-1);
    view.showHint(last !== undefined ? (last.layer === "all" ? null : undoOf(last)) : (next?.moves ?? null));
    if (next === null) {
      notation.textContent = "";
      at.textContent = "";
      line.hidden = true;
      how.textContent = "";
      how.hidden = true;
      doIt.hidden = true;
      speak(say(cubeSolved(view.state, view.size) ? "solved" : "guideDone"));
    } else {
      line.hidden = false;
      // On a detour, the turn that comes back from it, as the arrow on the cube shows; then the movement again.
      const shown = last === undefined ? next.moves : [undoOf(last)];
      notation.textContent = last === undefined ? next.left : movementText(shown, view.size);
      at.textContent = say("playerMoveOf", { at: next.index + 1, total: next.total });
      speak(movementSays(shown, view.size, language) ?? notation.textContent);
      explain();
      doIt.hidden = false;
    }
    off.hidden = detours.length === 0;
    off.textContent = detours.length === 0 ? "" : `${say("guideOff", { made: movesNotation(detours, view.size), wanted: next?.left ?? "" })}${language === "ja" ? "" : " "}${say("guideOffHow")}`;
    back.hidden = detours.length === 0;
    options.onChange?.(guide, heard);
    if (next === null && !ended) {
      ended = true;
      options.onEnd?.();
    }
  };
  /** How to make the movement by hand, from where the cube is looked at now: drag, look round first, or the keys for a turn of the whole cube. */
  const explain = () => {
    const next = guide.next;
    how.hidden = next === null || guide.detours.length > 0;
    if (next === null) return;
    const hint = view.hint;
    how.textContent = next.rotation
      ? say("guideWholeHow", { key: next.moves.map(rotationKeys).join(" "), button: say("guideDoIt") })
      : hint === null || hint.face === null
        ? say("guideLook")
        : next.moves.length > 1
          ? say("guideDragSlab", { count: next.moves.length })
          : next.moves[0].turns === 2
            ? say("guideDragHalf")
            : say("guideDrag");
  };
  const speak = (text: string) => {
    // Said again only when it changes, so a screen reader hears each movement once.
    if (text === spoken) return;
    spoken = text;
    says.textContent = text;
  };

  const stopTurn = view.on("turn", (move) => {
    if (making) return;
    paint(guide.heard(move));
  });
  const stopLook = view.on("look", explain);
  paint(null);

  return {
    get guide() {
      return guide;
    },
    takeBack: () => back.click(),
    makeNext: () => {
      if (guide.next !== null || guide.detours.length > 0) doIt.click();
    },
    load: (source) => {
      guide = new Guide(view.state, view.size, source);
      ended = false;
      spoken = "";
      paint(null);
    },
    setLocale: (locale) => {
      language = locale;
      spoken = "";
      paint(null);
    },
    destroy: () => {
      stopTurn();
      stopLook();
      view.showHint(null);
      root.remove();
    },
  };
}
