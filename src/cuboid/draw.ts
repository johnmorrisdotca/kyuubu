import type { CubeTheme } from "../view/view.ts";
import type { KyuubuLanguage } from "../words.ts";
/**
 * THE CUBOID ON THE SCREEN, drawn the way the cube is (`view/view.ts`): in
 * plain DOM and CSS with no canvas and no WebGL, a sticker a square element
 * given its whole place on the screen in one `matrix3d`, nothing nested in 3D,
 * so no browser can draw it flat. The sticker's size is one for every side:
 * the longest side of the puzzle is as long as a 3×3 is, so a cuboid is a cube
 * with some of it taken away, not a smaller picture.
 *
 * Every hand does what it does on a cube, with the cuboid's rule on top:
 * - drag a sticker and the layer that carries it that way turns with the
 *   pointer; a layer whose slice is not square follows to a half turn and no
 *   less, and snaps back if it is let go before the middle of the way;
 * - drag the space round it to turn the whole puzzle and look at it;
 * - keys in cubers' notation, which on a layer that only half turns turn it a
 *   half; the arrows look round it. The wheel over the puzzle looks round it.
 */
import { CuboidViewHands } from "./draw-hands.ts";
import type { CuboidViewEvents } from "./draw-types.ts";
import { type CuboidDims, type CuboidMove, cuboidMoveLegal, cuboidName, isCuboidDims, turnCuboid } from "./model.ts";

export type {
  CuboidViewEvents,
  CuboidViewOptions,
} from "./draw-types.ts";

/**
 * A cuboid on the screen. `new CuboidView(element, { dims: [2, 3, 3] })` draws
 * it in the element, which it fills, so the element needs a size; `destroy()`
 * takes it away again with every listener. A turn the puzzle cannot make
 * throws a `RangeError`, as `turnCuboid` does.
 *
 *
 * @example
 * ```ts no-run
 * import { CuboidView } from "@johnmorrisdotca/kyuubu/cuboid/draw";
 *
 * const host = document.createElement("div");
 * host.style.cssText = "width:300px;height:300px;position:relative";
 * document.body.append(host);
 * const cube = new CuboidView(host, { dims: [2, 3, 3], interactive: true });
 * console.log(cube.state);
 * // Call cube.destroy() when the host is removed.
 * ```
 * @param host - The DOM host with a size and position.
 * @param options - View or replay options.
 */
export class CuboidView extends CuboidViewHands {
  /** The stickers as they will be once every turn asked for has finished. */
  get state(): string {
    return this.target;
  }

  /** The puzzle's width, height and depth. */
  get dims(): CuboidDims {
    return this.sides;
  }

  /** Whether a turn is on its way or a layer is held. */
  get busy(): boolean {
    return this.animating || this.queue.length > 0 || this.drag !== null;
  }

  /** The way the puzzle is looked at now, in degrees. */
  get looking(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  /** Change how the puzzle looks, at once and without redrawing it. What is left out of `theme` stays as it is. */
  setTheme(theme: CubeTheme): void {
    const defined = Object.fromEntries(
      Object.entries(theme).filter(([key, value]) => value !== undefined && key !== "colours"),
    );
    const colours = Object.fromEntries(Object.entries(theme.colours ?? {}).filter(([, value]) => value !== undefined));
    this.theme = { ...this.theme, ...defined, colours: { ...this.theme.colours, ...colours } };
    this.dress();
    this.coloured = false;
    this.paint();
  }

  /** The language of the puzzle's accessible name. A `label` given when it was made is left as it is. */
  setLocale(locale: KyuubuLanguage): void {
    this.language = locale;
    this.root.setAttribute("aria-label", this.label());
  }

  /** Whether a person can turn it now. */
  setInteractive(interactive: boolean): void {
    this.options.interactive = interactive;
    this.root.style.cursor = interactive ? "grab" : "default";
  }

  /** How long a quarter turn takes, in milliseconds, from now on. */
  setTurnMs(ms: number): void {
    this.options.turnMs = Math.max(0, ms);
  }

  /** Put the stickers as given, at once, dropping any turn still to come. Another `dims` draws another puzzle. */
  setState(state: string, dims: CuboidDims = this.sides): void {
    this.settleDrag();
    this.queue = [];
    this.stopTurn();
    this.target = state;
    this.shown = state;
    if (dims.some((side, at) => side !== this.sides[at])) {
      if (!isCuboidDims(dims))
        throw new RangeError("A cuboid has three sides, each a whole number from 1 to 7, and is not 1×1×1");
      this.sides = dims;
      this.root.setAttribute("aria-label", this.label());
      this.root.dataset.dims = cuboidName(dims);
      this.build();
    }
    this.paint();
  }

  /** Turn a layer, animated after any turns already on their way. Told to `onTurn` only when `report` says so. A turn the puzzle cannot make throws a `RangeError`. */
  override turn(
    move: CuboidMove,
    { report = false, animate = true, ms }: { report?: boolean; animate?: boolean; ms?: number } = {},
  ): void {
    if (!cuboidMoveLegal(this.sides, move))
      throw new RangeError(`The ${cuboidName(this.sides)} cuboid cannot make that turn`);
    this.settleDrag();
    this.target = turnCuboid(this.target, this.sides, move);
    if (report) this.told(move);
    if (!animate) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
      return;
    }
    this.queue.push({ move, report, ms });
    if (!this.animating) this.next();
  }

  /** The same as `turn`, one move: for a replay, which plays steps made of several layers on a cube. */
  turnTogether(moves: readonly CuboidMove[], options: { animate?: boolean; ms?: number } = {}): void {
    for (const move of moves) this.turn(move, options);
  }

  /** Listen for a turn a person made (`turn`) or the view turned (`look`). Returns the call that stops listening. */
  on<K extends keyof CuboidViewEvents>(type: K, listener: CuboidViewEvents[K]): () => void {
    const set = this.listeners[type] as Set<CuboidViewEvents[K]>;
    set.add(listener);
    return () => set.delete(listener);
  }

  /** Turn the view to look at the puzzle from here. The pitch stays between −90 and 90 degrees. */
  override setLook(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-90, Math.min(90, pitch));
    this.draw();
    this.options.onLook?.(this.yaw, this.pitch);
    for (const listener of this.listeners.look) listener(this.yaw, this.pitch);
  }

  /** Back to the way the puzzle was first looked at. */
  resetLook(): void {
    this.setLook(-35, 28);
  }

  /** Build the 3D layers again, as a browser that let go of them needs. */
  override redraw(): void {
    for (const place of this.places.values()) place.drawn = undefined;
    this.draw();
  }

  /** Take the puzzle off the page, with every listener it added. */
  destroy(): void {
    this.listeners.turn.clear();
    this.listeners.look.clear();
    this.stopTurn();
    this.resize?.disconnect();
    for (const clean of this.cleanups) clean();
    this.root.remove();
  }
}
