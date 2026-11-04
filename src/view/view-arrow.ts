/**
 * The hint arrow: the element it is drawn in, and the arrow itself.
 * The seams, the hands and CubeView are built on this.
 */
import { CubeViewScene } from "./view-scene.ts";
import { HINT_COLOUR, HINT_EDGE, SVG } from "./view-types.ts";

/** The hint arrow: the element it is drawn in, and the arrow itself. The seams, the hands and CubeView are built on this. */
export abstract class CubeViewArrow extends CubeViewScene {
  /** The element the hint's arrow is drawn in: one, above every sticker, taking no pointer. */
  protected arrowElement(): HTMLDivElement {
    if (this.arrow !== null) return this.arrow;
    const element = document.createElement("div");
    element.dataset.hintArrow = "";
    element.setAttribute("aria-hidden", "true");
    Object.assign(element.style, { position: "absolute", pointerEvents: "none", zIndex: "100", visibility: "hidden" });
    this.pivot.append(element);
    this.arrow = element;
    return element;
  }

  /**
   * The arrow itself, `length` by `width` pixels on a cube 300 across: a dot
   * at its tail where the sticker is taken hold of, a shaft, and a head; two
   * heads for a half turn. For the whole cube, which no sticker is taken hold
   * of for, there is no dot, and the shaft is as thick as half a sticker and the
   * head as wide as the cube, so it is not taken for the arrow of one layer.
   * Drawn in its colour with an edge round it, so it shows on every sticker;
   * where motion is welcome, a mark runs along it.
   */
  protected drawArrow(element: HTMLDivElement, length: number, width: number, half: boolean, whole: boolean): void {
    for (const running of element.getAnimations?.({ subtree: true }) ?? []) running.cancel();
    const unit = this.unit();
    const shaft = whole
      ? Math.min(width * 0.5, unit * 0.55)
      : Math.min(width * 0.6, unit * (width > unit * 1.01 ? 0.3 : 0.2));
    const headWide = whole ? width * 0.9 : Math.min(width * 0.92, shaft * 3.2);
    const headLong = headWide * (whole ? 0.5 : 0.72);
    const mid = width / 2;
    const edge = Math.max(1, unit * 0.035);
    Object.assign(element.style, {
      width: `${length}px`,
      height: `${width}px`,
      left: `${-length / 2}px`,
      top: `${-width / 2}px`,
    });
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("width", String(length));
    svg.setAttribute("height", String(width));
    svg.setAttribute("viewBox", `0 0 ${length} ${width}`);
    svg.style.overflow = "visible";
    svg.style.display = "block";
    svg.style.opacity = "var(--kyuubu-hint-opacity, 0.96)";
    const heads = half ? [length, length - headLong * 0.78] : [length];
    const shapes = (): SVGElement[] => {
      const made: SVGElement[] = [];
      if (!whole) {
        const dot = document.createElementNS(SVG, "circle");
        dot.setAttribute("cx", "0");
        dot.setAttribute("cy", String(mid));
        dot.setAttribute("r", String(shaft * 0.95));
        made.push(dot);
      }
      const bar = document.createElementNS(SVG, "rect");
      bar.setAttribute("x", "0");
      bar.setAttribute("y", String(mid - shaft / 2));
      bar.setAttribute("width", String(Math.max(0, heads[heads.length - 1] - headLong * 0.9)));
      bar.setAttribute("height", String(shaft));
      made.push(bar);
      for (const tip of heads) {
        const head = document.createElementNS(SVG, "polygon");
        head.setAttribute(
          "points",
          `${tip - headLong},${mid - headWide / 2} ${tip},${mid} ${tip - headLong},${mid + headWide / 2}`,
        );
        made.push(head);
      }
      return made;
    };
    // The edge first, all of it, then the colour over it: one outline round the whole arrow.
    const outline = document.createElementNS(SVG, "g");
    outline.style.fill = "none";
    outline.style.stroke = `var(--kyuubu-hint-edge, ${HINT_EDGE})`;
    outline.style.strokeWidth = String(edge * 2);
    outline.style.strokeLinejoin = "round";
    outline.append(...shapes());
    const body = document.createElementNS(SVG, "g");
    body.style.fill = `var(--kyuubu-hint-colour, ${HINT_COLOUR})`;
    body.append(...shapes());
    svg.append(outline, body);
    const calm =
      this.host.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (!calm) {
      const runner = document.createElementNS(SVG, "circle");
      runner.setAttribute("cx", "0");
      runner.setAttribute("cy", String(mid));
      runner.setAttribute("r", String(shaft * 0.32));
      runner.style.fill = `var(--kyuubu-hint-edge, ${HINT_EDGE})`;
      svg.append(runner);
      runner.animate?.(
        [
          { transform: "translateX(0px)", opacity: 0 },
          { transform: `translateX(${(length - headLong) * 0.2}px)`, opacity: 1, offset: 0.2 },
          { transform: `translateX(${(length - headLong) * 0.85}px)`, opacity: 1, offset: 0.85 },
          { transform: `translateX(${length - headLong}px)`, opacity: 0 },
        ],
        { duration: 1400, iterations: Infinity, easing: "ease-in-out" },
      );
    }
    element.replaceChildren(svg);
  }
}
