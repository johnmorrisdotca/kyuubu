import { moveName } from "./move-name.ts";
import { WORDS, fill, languageOf, type KyuubuLanguage } from "./words.ts";

/**
 * THE MOVES AS A ROW OF BUTTONS: each move of a scramble or a solve written
 * as its code (`R'`, `Rw`, `x2`), the one just made marked, scrolled into
 * view as it changes, and every one a button that says where to go. `mountPlayer`
 * draws one under the cube; it can be drawn alone, and driven by anything.
 *
 * Tabbing reaches the list once, at the move just made; the arrow keys then
 * go a move back or on, and Home and End to the first and last move of the
 * main group (the solution). Each button is named with its code, what it
 * turns in words, and where it is, and the one just made says `aria-current`.
 * It is drawn in the page's own document, takes the page's font and colour,
 * and everything it colours is a custom property beginning `--kyuubu-moves-`
 * (`ink` and `paper` for the move just made, `rule`, `focus`, `height`), each
 * falling back to the player's own where the list is in a player.
 */

/** One move of a list: its code, what it turns in words (worked out from the code when left out), and the name a screen reader gives its button (the code and the words when left out). */
export type MoveListItem = { code: string; name?: string; label?: string };

/** A run of moves under a heading: a scramble, a solution. */
export type MoveListGroup = {
  /** What the run is called, shown above it and said by a screen reader. */
  label: string;
  /** Its moves, as codes or as items. */
  items: readonly (string | MoveListItem)[];
  /** The run the keys Home and End go to the ends of: the first one so marked, or else the first of all. */
  main?: boolean;
};

/** How a list is set up. */
export type MoveListOptions = {
  /** The runs of moves, in order. */
  groups: readonly MoveListGroup[];
  /** The move just made, counted across every run from 0, or null for none. */
  current?: number | null;
  /** English or Japanese: for the words of each move when none is given, and for the list's own name. The page's `lang` when left out. */
  locale?: KyuubuLanguage;
  /** Called when a move is chosen, by a press or a key: its place counted across every run from 0, its run and its place in the run. */
  onPick?: (index: number, group: number, at: number) => void;
  /** What a screen reader calls the whole list. "The moves" in the list's language when left out. */
  label?: string;
};

/** A list on the page. */
export type MoveListHandle = {
  /** The element the list is drawn in. */
  readonly element: HTMLElement;
  /** Mark the move just made, counted across every run from 0, or none with null; it is scrolled into view. */
  setCurrent(index: number | null): void;
  /** Other runs of moves in place of those showing. */
  setGroups(groups: readonly MoveListGroup[], current?: number | null): void;
  setLocale(locale: KyuubuLanguage): void;
  /** Put the keyboard's focus on the move just made. */
  focus(): void;
  /** Take it off the page, with every listener. */
  destroy(): void;
};

const STYLE_ID = "kyuubu-moves-style";
const INK = "var(--kyuubu-moves-ink,var(--kyuubu-player-ink,currentColor))";
const PAPER = "var(--kyuubu-moves-paper,var(--kyuubu-player-paper,Canvas))";
const RULE = "var(--kyuubu-moves-rule,var(--kyuubu-player-rule,color-mix(in srgb,currentColor 28%,transparent)))";
/** The list's stylesheet, put in the page once. */
export const MOVE_LIST_CSS = `
.kyuubu-moves{display:grid;gap:.5rem;box-sizing:border-box;max-width:100%;max-height:var(--kyuubu-moves-height,13.5rem);overflow-y:auto;overscroll-behavior:contain;padding:2px;font:inherit;color:inherit;position:relative}
.kyuubu-moves-group{display:flex;flex-wrap:wrap;gap:.25rem;align-items:center}
.kyuubu-moves-label{flex:0 0 100%;font-size:.75em;font-weight:700;letter-spacing:.04em;opacity:.75}
.kyuubu-moves button{touch-action:manipulation;font:600 .9375rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-ligatures:none;color:inherit;min-height:44px;min-width:44px;padding:0 .4rem;border-radius:10px;border:1px solid ${RULE};background:transparent;cursor:pointer}
.kyuubu-moves button[data-done]{opacity:.9}
.kyuubu-moves button:not([data-done]):not([aria-current]){opacity:.7}
.kyuubu-moves button[aria-current="step"]{opacity:1;background:${INK};border-color:${INK}}
.kyuubu-moves button[aria-current="step"]>span{color:${PAPER}}
.kyuubu-moves button:focus-visible{outline:2px solid var(--kyuubu-moves-focus,var(--kyuubu-player-focus,Highlight));outline-offset:2px}
`;

function addStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = MOVE_LIST_CSS;
  doc.head.append(style);
}

/**
 * A list of moves drawn in an element.
 *
 * @example
 * const list = mountMoveList(element, { groups: [{ label: "Solution", items: ["R", "U", "R'", "U'"] }], onPick: (index) => seek(index + 1) });
 * list.setCurrent(2); // R' is marked, and scrolled into view
 */
export function mountMoveList(host: HTMLElement, options: MoveListOptions): MoveListHandle {
  const doc = host.ownerDocument;
  addStyle(doc);
  let language: KyuubuLanguage = options.locale ?? languageOf(host.closest("[lang]")?.getAttribute("lang") ?? doc.documentElement.lang);
  let groups = options.groups;
  let current: number | null = options.current ?? null;
  let tokens: HTMLButtonElement[] = [];
  /** Where each token is: its run and its place in the run. */
  let places: { group: number; at: number }[] = [];

  const root = doc.createElement("div");
  root.className = "kyuubu-moves";
  root.dataset.kyuubuMoves = "";
  root.setAttribute("role", "group");
  host.replaceChildren(root);

  const nameOf = (item: string | MoveListItem): MoveListItem => (typeof item === "string" ? { code: item } : item);

  const pick = (index: number) => {
    const place = places[index];
    if (place !== undefined) options.onPick?.(index, place.group, place.at);
  };
  const home = () => {
    const first = groups.findIndex((group) => group.main === true);
    const from = first < 0 ? 0 : first;
    return groups.slice(0, from).reduce((sum, group) => sum + group.items.length, 0);
  };
  const end = () => {
    const first = groups.findIndex((group) => group.main === true);
    const through = first < 0 ? groups.length - 1 : first;
    return groups.slice(0, through + 1).reduce((sum, group) => sum + group.items.length, 0) - 1;
  };

  const reveal = (token: HTMLElement) => {
    // Scrolled inside the list and never the page: a move that comes into view must not pull the page after it.
    const top = token.offsetTop;
    const bottom = top + token.offsetHeight;
    const pad = 6;
    if (top - pad < root.scrollTop) root.scrollTop = Math.max(0, top - pad);
    else if (bottom + pad > root.scrollTop + root.clientHeight) root.scrollTop = bottom + pad - root.clientHeight;
  };

  const mark = (scroll: boolean) => {
    tokens.forEach((token, index) => {
      const now = current !== null && index === current;
      if (now) token.setAttribute("aria-current", "step");
      else token.removeAttribute("aria-current");
      if (current !== null && index < current) token.dataset.done = "";
      else delete token.dataset.done;
      token.tabIndex = now || (current === null && index === 0) || (current !== null && (current < 0 || current >= tokens.length) && index === 0) ? 0 : -1;
    });
    root.dataset.current = current === null ? "" : String(current);
    if (scroll && current !== null && tokens[current] !== undefined) reveal(tokens[current]);
  };

  const draw = () => {
    root.setAttribute("aria-label", options.label ?? WORDS[language].playerMovesLabel);
    tokens = [];
    places = [];
    const made = groups.map((group, g) => {
      const box = doc.createElement("div");
      box.className = "kyuubu-moves-group";
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", group.label);
      const label = doc.createElement("span");
      label.className = "kyuubu-moves-label";
      label.setAttribute("aria-hidden", "true");
      label.textContent = group.label;
      box.append(label);
      group.items.forEach((entry, at) => {
        const item = nameOf(entry);
        const name = item.name ?? moveName(item.code, language) ?? "";
        const token = doc.createElement("button");
        token.type = "button";
        // The code is in a span of its own so that the marked one can be coloured in the paper's colour over the ink's, whatever the ink is.
        const text = doc.createElement("span");
        text.textContent = item.code;
        token.append(text);
        token.dataset.index = String(tokens.length);
        token.setAttribute("aria-label", item.label ?? (name === "" ? item.code : fill(WORDS[language].playerToken, { code: item.code, name, where: `${at + 1}/${group.items.length}` })));
        token.addEventListener("click", () => pick(Number(token.dataset.index)));
        tokens.push(token);
        places.push({ group: g, at });
        box.append(token);
      });
      return box;
    });
    root.replaceChildren(...made);
    mark(true);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || tokens.length === 0) return;
    const at = tokens.indexOf(event.target as HTMLButtonElement);
    if (at < 0) return;
    let to: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") to = Math.min(tokens.length - 1, at + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = Math.max(0, at - 1);
    else if (event.key === "Home") to = home();
    else if (event.key === "End") to = end();
    if (to === null) return;
    event.preventDefault();
    pick(to);
    // The key moved the move just made, which now carries the focus: the one pressed on, if whatever is listening did not move it.
    (tokens[to] ?? tokens[at]).focus({ preventScroll: true });
  };
  root.addEventListener("keydown", onKey);
  draw();

  return {
    element: root,
    setCurrent(index) {
      current = index;
      mark(true);
    },
    setGroups(next, now) {
      groups = next;
      current = now === undefined ? current : now;
      draw();
    },
    setLocale(locale) {
      language = locale;
      draw();
    },
    focus() {
      (current === null ? tokens[0] : tokens[current])?.focus({ preventScroll: true });
    },
    destroy() {
      root.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
