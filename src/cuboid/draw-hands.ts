import { CUBE_FACE_ORDER, FACE_FRAMES } from "../cube.ts";
import type { CubeAxis, Vec3 } from "../types.ts";
import { axisVector } from "../view/geometry.ts";
import { CuboidViewScene } from "./draw-scene.ts";
import { COMMIT_FILTER, DRAG_LEAVE, DRAG_LEAVE_LEAST, SPEED_WINDOW } from "./draw-types.ts";
import {
  type CuboidDragPick,
  cuboidDragAngle,
  cuboidMoveForRelease,
  cuboidPastCommit,
  cuboidQuartersForRelease,
  pickCuboidDrag,
  readCuboidKey,
} from "./gestures.ts";
import { type CuboidMove, cuboidLayerOf, cuboidSlots, turnCuboid } from "./model.ts";

/** The pointer and the keys that turn a cuboid, and the queue of turns they make. CuboidView adds the ways a page asks the puzzle to turn. */
export abstract class CuboidViewHands extends CuboidViewScene {
  abstract setLook(yaw: number, pitch: number): void;
  abstract turn(move: CuboidMove, options?: { report?: boolean; animate?: boolean; ms?: number }): void;

  protected spinTo(radians: number): void {
    if (this.spin === null) return;
    this.spin = { ...this.spin, radians };
    this.draw(true);
  }

  protected quarterMs(): number {
    const calm =
      this.host.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    return calm ? 0 : this.options.turnMs;
  }

  /** The stickers of one layer gathered into the turning group, with the plastic that fills the gap: what a turn and a drag both start with. */
  protected lift(axis: CubeAxis, layer: number): void {
    const { slots } = cuboidSlots(this.sides);
    slots.forEach((slot, at) => {
      if (cuboidLayerOf(slot.centre, axis, this.sides) === layer) this.turning.append(this.stickers[at]);
    });
    this.covers(axis, layer);
    this.spin = { axis, radians: 0, layer };
    this.draw();
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

  /**
   * THE INSIDE OF THE PUZZLE, while a layer turns: a black rectangle on each
   * side of each gap the turn opens, one turning and one still, as long and as
   * wide as the slice, so the reader sees plastic where the layers part and
   * never through the puzzle.
   */
  protected covers(axis: CubeAxis, layer: number): void {
    const unit = this.unit();
    const depth = this.sides[axis];
    const out = axisVector(axis);
    const frame = FACE_FRAMES[CUBE_FACE_ORDER.find((face) => FACE_FRAMES[face].normal[axis] === 1)!];
    const across = (vector: Vec3) => this.sides[vector[0] !== 0 ? 0 : vector[1] !== 0 ? 1 : 2] * unit;
    const edges: number[] = [];
    // A gap opens wherever the turning layer meets a still one.
    for (const below of [layer - 1, layer]) if (below >= 0 && below < depth - 1) edges.push(below);
    for (const below of edges) {
      const edge = 2 * below - depth + 2;
      for (const [one, facing] of [
        [below, 1],
        [below + 1, -1],
      ] as const) {
        const cover = document.createElement("div");
        cover.dataset.cover = "";
        Object.assign(cover.style, {
          position: "absolute",
          width: `${across(frame.right)}px`,
          height: `${across(frame.down)}px`,
          left: `${-across(frame.right) / 2}px`,
          top: `${-across(frame.down) / 2}px`,
          background: this.plastic(),
          borderRadius: this.corner(),
          pointerEvents: "none",
        });
        this.places.set(cover, {
          right: frame.right,
          down: frame.down,
          out: out.map((value) => value * facing) as unknown as Vec3,
          at: out.map((value) => (value * edge * unit) / 2) as unknown as Vec3,
          layer: one,
        });
        (one === layer ? this.turning : this.still).append(cover);
      }
    }
  }

  protected told(move: CuboidMove): void {
    this.options.onTurn?.(move, this.target);
    for (const listener of this.listeners.turn) listener(move, this.target);
  }

  protected quarterPx(): number {
    return ((this.side * this.options.fill) / Math.sqrt(3)) * 0.7;
  }

  protected commitAngle(): number {
    return Math.max(5, Math.min(85, this.options.commitAngle));
  }

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

  protected beginDrag(pick: CuboidDragPick, at: number): void {
    this.settleDrag();
    if (this.animating || this.queue.length > 0) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
    }
    this.lift(pick.axis, pick.layer);
    this.drag = { pick, angle: 0, committed: false, samples: [{ at, angle: 0 }] };
    this.root.dataset.turning = "true";
    this.root.dataset.dragging = "true";
    this.root.dataset.halfOnly = String(pick.halfOnly);
  }

  protected followDrag(angle: number, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    drag.angle = angle;
    this.root.dataset.angle = String(Math.round(angle));
    drag.samples.push({ at, angle });
    while (drag.samples.length > 1 && at - drag.samples[0].at > SPEED_WINDOW * 2) drag.samples.shift();
    this.spinTo((angle * Math.PI) / 180);
    const committed = cuboidPastCommit(angle, drag.pick.halfOnly, this.commitAngle());
    if (committed !== drag.committed) {
      drag.committed = committed;
      this.markCommitted(committed);
    }
  }

  /** The pointer has let go, or the drag was given up: the layer snaps to the nearest turn the rules allow, or back, and only then, if it turned, is it a move and told to `onTurn`. */
  protected endDrag(released: boolean, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    this.drag = null;
    const since = drag.samples.find((sample) => at - sample.at <= SPEED_WINDOW);
    const speed = since === undefined ? 0 : (drag.angle - since.angle) / Math.max(at - since.at, 16);
    const quarters = released ? cuboidQuartersForRelease(drag.angle, speed, drag.pick.halfOnly, this.commitAngle()) : 0;
    const move = cuboidMoveForRelease(drag.pick, quarters);
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
      if (move !== null) {
        this.depth = 1;
        this.target = turnCuboid(this.target, this.sides, move);
        this.shown = this.target;
        this.paint();
      }
      this.animating = false;
      this.root.dataset.turning = "false";
      if (move !== null) this.told(move);
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
    let jumped = false;
    let quarters = 0;
    let duration = 0;
    // A turn given no time at all (reduced motion) is made at once, with every one waiting behind it that is given none either.
    for (; job !== undefined; job = this.queue.shift()) {
      quarters = job.move.turns === 3 ? -1 : job.move.turns;
      const calm = this.quarterMs() === 0 && this.options.turnMs !== 0;
      duration =
        job.ms !== undefined
          ? calm
            ? 0
            : job.ms
          : (this.quarterMs() * Math.abs(quarters) ** 0.6) / (1 + this.queue.length);
      if (duration > 0) break;
      this.shown = turnCuboid(this.shown, this.sides, job.move);
      jumped = true;
    }
    if (jumped) this.paint();
    if (job === undefined) {
      this.animating = false;
      this.root.dataset.turning = "false";
      return;
    }
    const running = job;
    this.animating = true;
    this.root.dataset.turning = "true";
    this.lift(running.move.axis, running.move.layer);
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / Math.max(duration, 1));
      const eased = 1 - (1 - t) ** 3;
      this.spinTo((eased * quarters * Math.PI) / 2);
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      this.shown = turnCuboid(this.shown, this.sides, running.move);
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

  protected slotAt(target: EventTarget | null): number | null {
    const sticker = (target as HTMLElement | null)?.closest?.("[data-slot]") as HTMLElement | null;
    return sticker === null || sticker === undefined || !this.root.contains(sticker)
      ? null
      : Number(sticker.dataset.slot);
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
    // A touch that begins on the puzzle is the puzzle's: Safari on a phone scrolls the page or zooms it from such a touch unless the touch itself is refused.
    const refuse = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    this.bind(this.root, "touchstart", refuse, false);
    this.bind(this.root, "touchmove", refuse, false);
    this.bind(this.root, "dblclick", (event) => event.preventDefault(), false);
    this.bind(this.root, "pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      this.root.setPointerCapture?.(event.pointerId);
      if (this.options.keyboard === "focus") this.root.focus({ preventScroll: true });
      const slot = this.options.interactive ? this.slotAt(event.target) : null;
      this.gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        at: event.timeStamp,
        slot,
        done: false,
        yaw: this.yaw,
        pitch: this.pitch,
      };
      this.root.style.cursor = "grabbing";
    });
    this.bind(this.root, "pointermove", (event) => {
      const gesture = this.gesture;
      if (gesture === null || gesture.id !== event.pointerId || gesture.done) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (gesture.slot === null) {
        this.setLook(gesture.yaw + dx * 0.45, gesture.pitch + dy * 0.45);
        return;
      }
      // A drag that wanders well off the puzzle's element is given up: the layer goes back.
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
        const pick = pickCuboidDrag(cuboidSlots(this.sides).slots[gesture.slot], this.sides, this.view(), dx, dy);
        if (pick === null) return;
        this.beginDrag(pick, gesture.at);
      }
      if (this.drag !== null)
        this.followDrag(cuboidDragAngle(this.drag.pick, dx, dy, this.quarterPx()), event.timeStamp);
    });
    const end = (released: boolean) => (event: PointerEvent) => {
      if (this.gesture?.id !== event.pointerId) return;
      this.gesture = null;
      this.endDrag(released, event.timeStamp);
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
        if (event.ctrlKey) this.setLook(this.yaw, this.pitch + delta * 0.25);
        else this.setLook(this.yaw + delta * 0.25, this.pitch);
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
        const read = readCuboidKey(event.key, event.shiftKey, this.sides, this.depth);
        if (read === null) return;
        event.preventDefault();
        if ("depth" in read) this.depth = read.depth;
        else {
          this.depth = 1;
          this.turn(read.move, { report: true });
        }
      },
      false,
    );
  }
}
