import { turnCube } from "../cube.ts";
import { type CubeScale, cubeWidthPx } from "../scale.ts";
import type { CubeMove, Vec3 } from "../types.ts";
import type { KyuubuLanguage } from "../words.ts";

import { apply, cross, type Mat3, placement } from "./geometry.ts";
import { type DragHint, dragHint, rotationHint } from "./hint.ts";

/**
 * THE CUBE ON THE SCREEN, in plain DOM and CSS: no canvas, no WebGL, no
 * framework. A sticker is a square element given its whole place on the
 * screen in one `matrix3d`, worked out here from the way the cube is looked
 * at and how far a turning layer has gone; a turn gathers the stickers of
 * its layer into a group, then puts every colour where it landed.
 *
 * Nothing is nested in 3D (no `preserve-3d`): which stickers face the viewer
 * and which part of a turning cube is in front are decided here, not by the
 * browser. Safari on a phone can let go of nested 3D layers and draw a cube
 * as one flat face; a cube that asks for no 3D context cannot be flattened.
 *
 * Every hand does something:
 * - drag a sticker across the cube and the layer that carries it that way turns
 *   with the pointer, forwards and back; let go past the point of no return
 *   and the turn is made, short of it and the layer goes back;
 * - drag the space around the cube to turn the whole cube and look at it;
 * - the wheel over a sticker turns the layer carrying it sideways, Ctrl with
 *   the wheel the one carrying it up and down, Shift with the wheel the face
 *   it is on; over the space around the cube the wheel turns the whole cube,
 *   sideways, or up and down with Ctrl;
 * - keys in cubers' notation (`keys.ts`), and the arrows to look around.
 */
import { CubeViewHands } from "./view-hands.ts";
import { type CubeTheme, type CubeViewEvents, SCRAMBLE_SHOWN, SCRAMBLE_TURN_MS } from "./view-types.ts";

export {
  CUBE_THEMES,
  type CubeTheme,
  type CubeViewEvents,
  type CubeViewOptions,
  DEFAULT_COLOURS,
  DEFAULT_PLASTIC,
  FACE_PROPERTIES,
} from "./view-types.ts";

/**
 * A cube on the screen. `new CubeView(element, { size: 3 })` draws it in the
 * element, which it fills, so the element needs a size; `destroy()` takes it
 * away again with every listener.
 *
 *
 * @example
 * ```ts no-run
 * import { CubeView } from "@johnmorrisdotca/kyuubu";
 *
 * const host = document.createElement("div");
 * host.style.cssText = "width:300px;height:300px;position:relative";
 * document.body.append(host);
 * const cube = new CubeView(host, { size: 3, interactive: true });
 * console.log(cube.state);
 * // Call cube.destroy() when the host is removed.
 * ```
 * @param host - The DOM host with a size and position.
 * @param options - View or replay options.
 */
export class CubeView extends CubeViewHands {
  /** The stickers as they will be once every turn asked for has finished. */
  get state(): string {
    return this.target;
  }

  /** The cube's side. */
  get size(): number {
    return this.n;
  }

  /**
   * Change how the cube looks, at once and without redrawing it: any of its
   * colours, its plastic, and the shape of its stickers. What is left out of
   * `theme` stays as it is. To go back to the CSS custom properties and the
   * standard colours, pass `CUBE_THEMES.standard`, or make the cube again.
   */
  setTheme(theme: CubeTheme): void {
    const defined = Object.fromEntries(
      Object.entries(theme).filter(([key, value]) => value !== undefined && key !== "colours"),
    );
    const colours = Object.fromEntries(Object.entries(theme.colours ?? {}).filter(([, value]) => value !== undefined));
    this.theme = { ...this.theme, ...defined, colours: { ...this.theme.colours, ...colours } };
    this.dress();
    // `dress` put the plastic on every sticker, so every one is coloured again.
    this.coloured = false;
    this.paint();
  }

  /** The language of the cube's accessible name. A `label` given when the cube was made is left as it is. */
  setLocale(locale: KyuubuLanguage): void {
    this.language = locale;
    this.root.setAttribute("aria-label", this.label());
  }

  /**
   * Draw the cube at a scale, or at a width in pixels (which wins), or with
   * neither, back to filling the box it is in. The box keeps one steady
   * square, never wider than its container, so nothing round it moves when
   * the cube does. The cube's own `interactive` is not touched.
   */
  override setScale(scale?: CubeScale, width?: number): void {
    const px = cubeWidthPx(scale, width);
    const box = this.host.style;
    if (px === null) {
      // A cube never given a scale leaves its box exactly as the page sized it.
      if (!this.sizedByScale) return;
      box.width = this.sized.width;
      box.height = this.sized.height;
      box.maxWidth = this.sized.maxWidth;
      box.aspectRatio = this.sized.aspectRatio;
      this.sizedByScale = false;
    } else {
      if (!this.sizedByScale)
        this.sized = { width: box.width, height: box.height, maxWidth: box.maxWidth, aspectRatio: box.aspectRatio };
      this.sizedByScale = true;
      box.width = `${px}px`;
      box.height = "auto";
      box.maxWidth = "100%";
      box.aspectRatio = "1 / 1";
      if (this.host.ownerDocument.defaultView?.getComputedStyle(this.host).position === "static")
        box.position = "relative";
    }
    this.root.style.cursor = this.options.interactive ? "grab" : "default";
    this.measureSide();
    if (this.stickers.length > 0) this.look();
  }

  /** Whether a person can turn it now. */
  setInteractive(interactive: boolean): void {
    this.options.interactive = interactive;
    this.root.style.cursor = interactive ? "grab" : "default";
  }

  /** Put the stickers as given, at once, dropping any turn still to come. */
  setState(state: string, size: number = this.n): void {
    this.settleDrag();
    this.queue = [];
    this.stopTurn();
    this.target = state;
    this.shown = state;
    if (size !== this.n) {
      this.n = size;
      this.hintMoves = null;
      this.root.setAttribute("aria-label", this.label());
      this.build();
    }
    this.paint();
  }

  /** Turn a layer, animated after any turns already on their way. Told to `onTurn` only when `report` says so. */
  override turn(
    move: CubeMove,
    { report = false, animate = true }: { report?: boolean; animate?: boolean } = {},
  ): void {
    this.settleDrag();
    this.target = turnCube(this.target, this.n, move);
    if (report) this.told(move);
    if (!animate) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
      return;
    }
    this.queue.push({ moves: [move], report });
    if (!this.animating) this.next();
  }

  /**
   * Several layers about one axis turned together, the same way and as far,
   * as one movement: a wide turn (`Rw` is the right face and the layer behind
   * it). `ms`, when given, is how long the whole movement takes, whatever
   * `turnMs` says, so a replay can keep a solve's own pace; a device that
   * asks for reduced motion still gets none. Never told to `onTurn`. Moves
   * that do not share an axis and a distance are turned one after another.
   */
  turnTogether(moves: readonly CubeMove[], { animate = true, ms }: { animate?: boolean; ms?: number } = {}): void {
    if (moves.length === 0) return;
    const together =
      moves.every((move) => move.axis === moves[0].axis && move.turns === moves[0].turns && move.layer !== "all") ||
      moves.length === 1;
    if (!together) {
      for (const move of moves)
        this.turnTogether([move], { animate, ms: ms === undefined ? undefined : ms / moves.length });
      return;
    }
    this.settleDrag();
    for (const move of moves) this.target = turnCube(this.target, this.n, move);
    if (!animate) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
      return;
    }
    this.queue.push({ moves: [...moves], report: false, ms });
    if (!this.animating) this.next();
  }

  /**
   * Scramble the cube with these turns, from the cube as it is. Turned
   * quickly, the way a hand scrambles it: the last ten are shown, each in
   * under a tenth of a second, and every one before them is made at once, so a
   * scramble of a hundred turns on a 7×7 is over in a second and not a blur
   * that shows nothing. With `animate: false`, or `animateScramble: false` when
   * the cube was made, nothing is shown turning. Never told to `onTurn`.
   */
  scramble(moves: readonly CubeMove[], { animate = this.options.animateScramble }: { animate?: boolean } = {}): void {
    this.settleDrag();
    const shown = animate ? Math.min(moves.length, SCRAMBLE_SHOWN) : 0;
    let state = this.target;
    for (const move of moves.slice(0, moves.length - shown)) state = turnCube(state, this.n, move);
    this.setState(state);
    for (const move of moves.slice(moves.length - shown)) this.turnTogether([move], { ms: SCRAMBLE_TURN_MS });
  }

  /** Whether a turn asked for is still on its way. */
  get busy(): boolean {
    return this.animating || this.queue.length > 0;
  }

  /** The cube taken out of the page and put straight back, so that the browser makes its layers again. Nothing about it changes. */
  override redraw(): void {
    const pivot = this.pivot;
    pivot.remove();
    void this.root.offsetWidth;
    this.root.append(pivot);
  }

  /** How long a quarter turn made by a key, by notation or from code takes, in milliseconds, from now on. */
  setTurnMs(ms: number): void {
    this.options.turnMs = Math.max(0, ms);
  }

  /** Look at the cube from another way round, in degrees. */
  override setLook(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-89, Math.min(89, pitch));
    this.look();
    this.options.onLook?.(this.yaw, this.pitch);
    for (const listener of [...this.listeners.look]) listener(this.yaw, this.pitch);
  }

  /**
   * Listen for what the cube tells `onTurn` and `onLook`, beside them, as
   * many listeners as are wanted: `"turn"` for every turn a person makes,
   * `"look"` whenever the view turns. Returns what stops listening.
   */
  on(type: "turn", listener: CubeViewEvents["turn"]): () => void;
  on(type: "look", listener: CubeViewEvents["look"]): () => void;
  on(type: keyof CubeViewEvents, listener: CubeViewEvents[keyof CubeViewEvents]): () => void {
    const set = this.listeners[type] as Set<typeof listener>;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /**
   * Show on the cube how to make a turn: the layer that turns is lit and the
   * rest dimmed, and an arrow lies across the stickers the way to drag them,
   * worked out afresh whenever the cube is looked at from somewhere else. The
   * arrow is the drag's own rules run backwards, so a drag along it from the
   * sticker at its tail is that turn. Several layers about one axis turned as
   * far (a wide turn) are lit as one slab with one arrow; each is dragged on
   * its own. A turn of the whole cube lights nothing: no drag on a sticker
   * makes it. `null` takes the hint away. Nothing about the cube changes.
   */
  showHint(moves: CubeMove | readonly CubeMove[] | null): void {
    const list = moves === null ? [] : Array.isArray(moves) ? [...(moves as readonly CubeMove[])] : [moves as CubeMove];
    this.hintMoves = list.length === 0 ? null : list;
    this.hintNow = null;
    this.arrowKey = "";
    this.light();
    this.draw();
  }

  /** What the hint shows from where the cube is looked at now: the layers lit, the sticker to take hold of and the way to drag it; null with no hint, or for a turn of the whole cube. */
  get hint(): DragHint | null {
    return this.hintNow;
  }

  /** Back to the way it was first seen. */
  resetLook(): void {
    this.setLook(this.options.yaw, this.options.pitch);
  }

  /** The way the cube is looked at now, in degrees. */
  get looking(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  /** Take the cube off the page, with every listener it added. */
  destroy(): void {
    this.listeners.turn.clear();
    this.listeners.look.clear();
    this.stopTurn();
    this.resize?.disconnect();
    for (const clean of this.cleanups) clean();
    this.root.remove();
  }

  /** Where the hint's arrow is drawn from here, or nowhere: no side of the layer (or, for the whole cube, of the sides it turns) can be seen, or a layer is turning. */
  protected override drawHint(view: Mat3, scale: number, lens: number): void {
    const moves = this.hintMoves;
    let whole = false;
    if (moves !== null) whole = moves.some((move) => move.layer === "all");
    const hint = moves === null ? null : whole ? rotationHint(moves, this.n, view) : dragHint(moves, this.n, view);
    // A turn of the whole cube is drawn an arrow, but is not a drag: `hint` stays null for it, as it always has.
    this.hintNow = whole ? null : hint;
    if (moves === null) delete this.root.dataset.hint;
    else this.root.dataset.hint = whole ? "whole" : hint?.face === null || hint === null ? "look" : "drag";
    // With no hint and no mark left to take off there is nothing to do: not a pass over every sticker of a 7×7 in every frame.
    if (hint !== null || this.grabbed) {
      for (const sticker of this.stickers) {
        const grab = hint?.grab === Number(sticker.dataset.slot);
        if (grab && sticker.dataset.hintGrab === undefined) sticker.dataset.hintGrab = "";
        else if (!grab && sticker.dataset.hintGrab !== undefined) delete sticker.dataset.hintGrab;
      }
      this.grabbed = hint?.grab !== undefined && hint.grab !== null;
    }
    const arrow = hint?.arrow ?? null;
    if (arrow === null || hint === null || this.spin !== null) {
      if (this.arrow !== null) this.arrow.style.visibility = "hidden";
      return;
    }
    const half = this.unit() / 2;
    const length = arrow.length * half;
    const width = arrow.width * half;
    const element = this.arrowElement();
    const key = `${length.toFixed(1)}|${width.toFixed(1)}|${hint.quarters}|${this.n}|${whole}`;
    if (key !== this.arrowKey) {
      this.arrowKey = key;
      this.drawArrow(element, length, width, hint.quarters === 2, whole);
    }
    const scaled = (v: Vec3) => apply(view, v).map((value) => value * scale) as unknown as Vec3;
    // Its middle, half its length on from the sticker it starts at, lifted a hair off the face.
    const middle = arrow.from.map(
      (value, k) => (value + (arrow.along[k] * arrow.length) / 2) * half + arrow.normal[k] * 0.6,
    ) as unknown as Vec3;
    element.style.transform = `perspective(${lens}px) ${placement(scaled(arrow.along), scaled(cross(arrow.along, arrow.normal)), apply(view, arrow.normal), scaled(middle))}`;
    element.style.visibility = "";
    element.dataset.drag = hint.drag!.map((value) => value.toFixed(4)).join(",");
  }
}
