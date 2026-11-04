/**
 * The pointer, the wheel and the keys that turn a cube, and the queue of turns they make.
 * CubeView adds the ways a page asks the cube to turn.
 */
import { cubeSlots, layerOf, turnCube } from "../cube.ts";
import type { CubeMove } from "../types.ts";
import {
  type DragPick,
  dragAngle,
  moveForWheel,
  movesForRelease,
  pastCommit,
  pickDrag,
  quartersForRelease,
} from "./gestures.ts";
import { readKey } from "./keys.ts";
import { CubeViewSeams } from "./view-seams.ts";
import { COMMIT_FILTER, DRAG_LEAVE, DRAG_LEAVE_LEAST, SPEED_WINDOW, WHEEL_STEP } from "./view-types.ts";

/** The pointer, the wheel and the keys that turn a cube, and the queue of turns they make. CubeView adds the ways a page asks the cube to turn. */
export abstract class CubeViewHands extends CubeViewSeams {
  abstract setLook(yaw: number, pitch: number): void;
  abstract turn(move: CubeMove, options?: { report?: boolean; animate?: boolean }): void;

  /** A turn a person made, told to `onTurn` and to every listener. */
  protected told(move: CubeMove, state: string = this.target): void {
    this.options.onTurn?.(move, state);
    for (const listener of [...this.listeners.turn]) listener(move, state);
  }

  /** The turning group turned this far about the spin's axis, and drawn. */
  protected spinTo(radians: number): void {
    if (this.spin === null) return;
    this.spin = { ...this.spin, radians };
    this.draw(true);
  }

  /** How long a quarter turn takes now: no time at all on a device that asks for reduced motion. */
  protected quarterMs(): number {
    const calm =
      this.host.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    return calm ? 0 : this.options.turnMs;
  }

  /** The stickers of one layer gathered into the turning group, with the plastic that fills the gap: what a turn and a drag both start with. */
  protected lift(move: CubeMove, others: readonly CubeMove[] = []): { moving: number[]; covers: HTMLDivElement[] } {
    const { slots } = cubeSlots(this.n);
    const layers = new Set([move, ...others].map((one) => one.layer));
    const moving = slots
      .map((slot, at) => (layers.has("all") || layers.has(layerOf(slot.centre, move.axis, this.n)) ? at : -1))
      .filter((at) => at >= 0);
    for (const at of moving) this.turning.append(this.stickers[at]);
    const covers = this.covers(move, layers);
    this.spin = { axis: move.axis, radians: 0, layers };
    this.draw();
    return { moving, covers };
  }

  /** The turning group put back as it was, its stickers still again. */
  protected lower(): void {
    for (const sticker of [...this.turning.children])
      if ((sticker as HTMLElement).dataset.slot !== undefined) this.still.append(sticker);
    this.turning.replaceChildren();
    for (const cover of [...this.still.children])
      if ((cover as HTMLElement).dataset.cover !== undefined) cover.remove();
    for (const element of [...this.places.keys()]) if (element.dataset.cover !== undefined) this.places.delete(element);
    this.spin = null;
    this.draw();
  }

  /** The pixels a pointer goes to drag a layer a quarter turn: seven tenths of the cube's edge as it is drawn. */
  protected quarterPx(): number {
    return ((this.side * this.options.fill) / Math.sqrt(3)) * 0.7;
  }

  protected commitAngle(): number {
    return Math.max(5, Math.min(85, this.options.commitAngle));
  }

  /** Whether the held layer is past the point of no return, said on the cube and shown on the layer. */
  protected markCommitted(committed: boolean): void {
    this.root.dataset.committed = String(committed);
    if (this.drag === null) delete this.root.dataset.angle;
    for (const sticker of [...this.turning.children] as HTMLElement[]) {
      if (sticker.dataset.slot === undefined) continue;
      (sticker.firstChild as HTMLDivElement).style.filter = committed
        ? `var(--kyuubu-commit-filter, ${COMMIT_FILTER})`
        : "";
    }
  }

  /** A drag has picked its layer: every turn still on its way is finished at once, and the layer is lifted to follow the pointer. */
  protected beginDrag(pick: DragPick, at: number): void {
    this.settleDrag();
    if (this.animating || this.queue.length > 0) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
    }
    this.lift(
      { axis: pick.axis, layer: pick.layer, turns: 1 },
      pick.also === undefined ? [] : [{ axis: pick.axis, layer: pick.also, turns: 1 }],
    );
    if (pick.also !== undefined) this.root.dataset.seam = "held";
    // Where the pointer went down counts as the first place the layer was: a flick is measured from there.
    this.drag = { pick, angle: 0, committed: false, samples: [{ at, angle: 0 }] };
    this.root.dataset.turning = "true";
    this.root.dataset.dragging = "true";
  }

  /** The held layer turned to where the pointer now has it. Nothing is a move yet. */
  protected followDrag(angle: number, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    drag.angle = angle;
    this.root.dataset.angle = String(Math.round(angle));
    drag.samples.push({ at, angle });
    while (drag.samples.length > 1 && at - drag.samples[0].at > SPEED_WINDOW * 2) drag.samples.shift();
    this.spinTo((angle * Math.PI) / 180);
    const committed = pastCommit(angle, this.commitAngle());
    if (committed !== drag.committed) {
      drag.committed = committed;
      this.markCommitted(committed);
    }
  }

  /**
   * The pointer has let go, or the drag was given up: the layer snaps to the
   * nearest quarter turn the rules allow, or back, and only then, if it
   * turned, is it a move and told to `onTurn`.
   */
  protected endDrag(released: boolean, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    this.drag = null;
    const since = drag.samples.find((sample) => at - sample.at <= SPEED_WINDOW);
    const speed = since === undefined ? 0 : (drag.angle - since.angle) / Math.max(at - since.at, 16);
    const quarters = released ? quartersForRelease(drag.angle, speed, this.commitAngle()) : 0;
    const made = movesForRelease(drag.pick, quarters);
    this.markCommitted(false);
    this.root.dataset.dragging = "false";
    const from = drag.angle;
    const to = quarters * 90;
    const duration = this.quarterMs() * (Math.abs(to - from) / 90) ** 0.6;
    this.animating = true;
    const finish = () => {
      cancelAnimationFrame(this.frame);
      this.finishSnap = null;
      this.lower();
      const heard: [CubeMove, string][] = [];
      if (made.length > 0) {
        this.depth = 1;
        for (const move of made) {
          this.target = turnCube(this.target, this.n, move);
          heard.push([move, this.target]);
        }
        this.shown = this.target;
        this.paint();
      }
      this.animating = false;
      this.root.dataset.turning = "false";
      delete this.root.dataset.seam;
      for (const [move, state] of heard) this.told(move, state);
    };
    this.finishSnap = finish;
    const started = performance.now();
    const step = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      this.spinTo(((from + (to - from) * eased) * Math.PI) / 180);
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      finish();
      this.next();
    };
    this.frame = requestAnimationFrame(step);
  }

  /** Before anything else changes the cube: a layer still held is put back, and one still snapping is finished at once, its move made. */
  protected settleDrag(): void {
    if (this.drag !== null) {
      this.drag = null;
      if (this.gesture !== null) this.gesture.done = true;
      this.markCommitted(false);
      this.root.dataset.dragging = "false";
      this.root.dataset.turning = "false";
      this.lower();
    }
    this.finishSnap?.();
  }

  protected next(): void {
    let job = this.queue.shift();
    let move: CubeMove | undefined;
    let quarters = 0;
    let duration = 0;
    // A turn given no time at all (reduced motion, or turns set to take none) is made at once, with every one waiting
    // behind it that is given none either: nothing to see, so nothing to wait a frame of the screen for.
    let jumped = false;
    for (; job !== undefined; job = this.queue.shift()) {
      move = job.moves[0];
      quarters = move.turns === 3 ? -1 : move.turns;
      const calm = this.quarterMs() === 0 && this.options.turnMs !== 0;
      // Faster while turns are waiting behind this one, so a typed sequence never lags the hands; a turn given its own time keeps it.
      duration =
        job.ms !== undefined
          ? calm
            ? 0
            : job.ms
          : (this.quarterMs() * Math.abs(quarters) ** 0.6) / (1 + this.queue.length);
      if (duration > 0) break;
      for (const one of job.moves) this.shown = turnCube(this.shown, this.n, one);
      jumped = true;
    }
    if (jumped) this.paint();
    if (job === undefined || move === undefined) {
      this.animating = false;
      this.root.dataset.turning = "false";
      return;
    }
    this.animating = true;
    this.root.dataset.turning = "true";
    this.lift(move, job.moves.slice(1));
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / Math.max(duration, 1));
      const eased = 1 - (1 - t) ** 3;
      this.spinTo((eased * quarters * Math.PI) / 2);
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      for (const one of job.moves) this.shown = turnCube(this.shown, this.n, one);
      this.lower();
      this.paint();
      this.next();
    };
    this.frame = requestAnimationFrame(step);
  }

  protected stopTurn(): void {
    cancelAnimationFrame(this.frame);
    this.animating = false;
    this.finishSnap = null;
    if (this.drag !== null) {
      this.drag = null;
      if (this.gesture !== null) this.gesture.done = true;
    }
    this.markCommitted(false);
    this.root.dataset.dragging = "false";
    this.root.dataset.turning = "false";
    this.lower();
  }
  protected personTurns(move: CubeMove): void {
    this.depth = 1;
    this.turn(move, { report: true });
  }

  protected bind<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | Document,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    passive = true,
  ): void {
    const listener = handler as EventListener;
    element.addEventListener(type, listener, { passive });
    this.cleanups.push(() => element.removeEventListener(type, listener));
  }

  protected override hands(): void {
    // A touch that begins on the cube is the cube's: Safari on a phone scrolls the page up and down, or zooms it on a
    // second tap, from such a touch unless the touch itself is refused, whatever `touch-action` says. The pointer events
    // a drag is read from still come. A touch beside the cube's element is the page's, as ever.
    const refuse = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    this.bind(this.root, "touchstart", refuse, false);
    this.bind(this.root, "touchmove", refuse, false);
    this.bind(this.root, "dblclick", (event) => event.preventDefault(), false);
    this.bind(this.root, "pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      this.root.setPointerCapture?.(event.pointerId);
      const slot = this.options.interactive ? this.slotAt(event.target) : null;
      const first = this.gesture;
      // A second finger on another sticker, before the layer is picked: the two together take two neighbouring layers.
      if (
        first !== null &&
        first.id !== event.pointerId &&
        !first.done &&
        first.slot !== null &&
        first.partner === null &&
        slot !== null &&
        this.drag === null &&
        event.pointerType === "touch"
      ) {
        first.partner = {
          id: event.pointerId,
          slot,
          x: event.clientX,
          y: event.clientY,
          now: [event.clientX, event.clientY],
        };
        this.root.dataset.seam = "pair";
        return;
      }
      if (this.options.keyboard === "focus") this.root.focus({ preventScroll: true });
      const seams = slot === null ? [] : this.seamsUnder(slot, event.clientX, event.clientY);
      this.gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        at: event.timeStamp,
        slot,
        done: false,
        yaw: this.yaw,
        pitch: this.pitch,
        now: [event.clientX, event.clientY],
        seams,
        partner: null,
      };
      this.lightSeam(slot === null ? null : (seams[0] ?? null), slot);
      this.root.style.cursor = "grabbing";
    });
    this.bind(this.root, "pointermove", (event) => {
      const gesture = this.gesture;
      if (gesture === null || gesture.done) return;
      if (gesture.partner?.id === event.pointerId) gesture.partner.now = [event.clientX, event.clientY];
      else if (gesture.id === event.pointerId) gesture.now = [event.clientX, event.clientY];
      else return;
      // With two fingers down the pair goes the way they go together: the mean of the two.
      const pair = gesture.partner;
      const dx = (gesture.now[0] - gesture.x + (pair === null ? 0 : pair.now[0] - pair.x)) / (pair === null ? 1 : 2);
      const dy = (gesture.now[1] - gesture.y + (pair === null ? 0 : pair.now[1] - pair.y)) / (pair === null ? 1 : 2);
      if (gesture.slot === null) {
        this.setLook(gesture.yaw + dx * 0.45, gesture.pitch + dy * 0.45);
        return;
      }
      // A drag that wanders well off the cube's element is given up: the layer goes back.
      const box = this.root.getBoundingClientRect();
      const room = Math.max(DRAG_LEAVE_LEAST, Math.min(box.width, box.height) * DRAG_LEAVE);
      if (
        event.clientX < box.left - room ||
        event.clientX > box.right + room ||
        event.clientY < box.top - room ||
        event.clientY > box.bottom + room
      ) {
        gesture.done = true;
        this.endDrag(false, event.timeStamp);
        return;
      }
      if (this.drag === null) {
        // The layer is picked once, where the drag can be told, and stays picked: the angle is counted from where the pointer went down.
        const slots = cubeSlots(this.n).slots;
        const seams = pair === null ? gesture.seams : this.pairSeams(slots[gesture.slot], slots[pair.slot]);
        const pick = pickDrag(slots[gesture.slot], this.n, this.view(), dx, dy, seams);
        if (pick === null) return;
        this.beginDrag(pick, gesture.at);
        // The ring was a promise of the two layers; what is held is the answer, and shows for itself.
        if (pick.also === undefined) this.lightSeam(null, null);
      }
      if (this.drag !== null) this.followDrag(dragAngle(this.drag.pick, dx, dy, this.quarterPx()), event.timeStamp);
    });
    const end = (released: boolean) => (event: PointerEvent) => {
      const gesture = this.gesture;
      if (gesture === null || (gesture.id !== event.pointerId && gesture.partner?.id !== event.pointerId)) return;
      this.gesture = null;
      this.endDrag(released, event.timeStamp);
      this.lightSeam(null, null);
      delete this.root.dataset.seam;
      this.root.style.cursor = this.options.interactive ? "grab" : "default";
    };
    this.bind(this.root, "pointerup", end(true));
    this.bind(this.root, "pointercancel", end(false));
    // Escape gives a held layer up, wherever the keys are listened for.
    this.bind(this.host.ownerDocument, "keydown", (event) => {
      if (event.key !== "Escape" || this.drag === null) return;
      if (this.gesture !== null) this.gesture.done = true;
      this.endDrag(false, event.timeStamp);
    });
    this.bind(
      this.root,
      "wheel",
      (event) => {
        event.preventDefault();
        const delta =
          (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) *
          (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 400 : 1);
        const slot = this.options.interactive ? this.slotAt(event.target) : null;
        if (slot === null) {
          if (event.ctrlKey) this.setLook(this.yaw, this.pitch + delta * 0.25);
          else this.setLook(this.yaw + delta * 0.25, this.pitch);
          return;
        }
        this.wheelSum += delta;
        if (Math.abs(this.wheelSum) < WHEEL_STEP) return;
        const down = this.wheelSum > 0;
        this.wheelSum = 0;
        // A wheel that spins freely would queue turns for seconds; two waiting is enough.
        if (this.queue.length >= 2) return;
        const way = event.shiftKey ? "face" : event.ctrlKey ? "upDown" : "across";
        this.personTurns(moveForWheel(cubeSlots(this.n).slots[slot], this.n, this.view(), way, down));
      },
      false,
    );
    if (this.options.keyboard === "none") return;
    if (this.options.keyboard === "focus") this.root.tabIndex = 0;
    const keysOn: HTMLElement | Document = this.options.keyboard === "page" ? document : this.root;
    this.bind(
      keysOn,
      "keydown",
      (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const from = event.target as HTMLElement | null;
        if (
          from !== null &&
          from !== this.root &&
          (from.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(from.tagName))
        )
          return;
        const looks: Record<string, [number, number]> = {
          ArrowLeft: [-15, 0],
          ArrowRight: [15, 0],
          ArrowUp: [0, -15],
          ArrowDown: [0, 15],
        };
        if (looks[event.key] !== undefined) {
          event.preventDefault();
          this.setLook(this.yaw + looks[event.key][0], this.pitch + looks[event.key][1]);
          return;
        }
        if (!this.options.interactive) return;
        const read = readKey(event.key, event.shiftKey, this.n, this.depth);
        if (read === null) return;
        event.preventDefault();
        if ("depth" in read) this.depth = read.depth;
        else this.personTurns(read.move);
      },
      false,
    );
  }
}
