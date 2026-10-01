import { seededRandom } from "./random.ts";
import { reflectAttributes } from "./reflect.ts";
import { CUBE_SCALES, isCubeScale, type CubeScale } from "./scale.ts";
import { SCRAMBLE_PACES, keepScrambling, type KeepScramblingHandle, type ScramblePace } from "./scrambler.ts";
import { CUBE_THEMES, CubeView } from "./view/view.ts";
import { languageOf } from "./words.ts";

/**
 * A CUBE THAT KEEPS TURNING, as a custom element, for a background or a
 * widget on a page with no framework and for one with any:
 *
 *     <kyuubu-scramble size="3" pace="slow" scale="small"></kyuubu-scramble>
 *
 * `pace` is seconds between turns (`0.5`, `1`) or `fast`, `normal`, `slow`.
 * It turns nothing on a hidden tab or on a device asking for reduced motion,
 * and `pause()` and `play()` stop and start it. `defineScramble()` registers
 * it; importing `@johnmorrisdotca/kyuubu/element/define` does that too.
 */

/** The attributes the element reads. Changing any draws the cube afresh, except `pace` and `paused`, which change the loop alone. */
export const SCRAMBLE_ELEMENT_ATTRIBUTES = ["size", "pace", "paused", "scale", "width", "theme", "faces", "interactive", "seed", "lang"] as const;

/** The name the element is registered under. */
export const SCRAMBLE_ELEMENT_NAME = "kyuubu-scramble";

/**
 * What the element adds to an ordinary one. Every attribute is also a property
 * that writes it, as React, Vue and Svelte set them: reading gives the text of the
 * attribute, or `null`, and a flag (`paused`, `faces`, `interactive`) reads as a boolean.
 */
export type KyuubuScrambleElement = HTMLElement & {
  get size(): string | null;
  set size(value: string | number | boolean | null | undefined);
  get pace(): string | null;
  set pace(value: string | number | boolean | null | undefined);
  get paused(): boolean;
  set paused(value: boolean | string | null | undefined);
  get scale(): string | null;
  set scale(value: string | number | boolean | null | undefined);
  get width(): string | null;
  set width(value: string | number | boolean | null | undefined);
  get theme(): string | null;
  set theme(value: string | number | boolean | null | undefined);
  get faces(): boolean;
  set faces(value: boolean | string | null | undefined);
  get interactive(): boolean;
  set interactive(value: boolean | string | null | undefined);
  get seed(): string | null;
  set seed(value: string | number | boolean | null | undefined);
  play(): void;
  pause(): void;
  readonly running: boolean;
  readonly cube: CubeView | null;
};

let made: CustomElementConstructor | null = null;

/** A pace from an attribute: a name, or seconds. Anything else is left to the default. */
export function paceFromAttribute(value: string | null): number | ScramblePace | undefined {
  if (value === null) return undefined;
  if (value in SCRAMBLE_PACES) return value as ScramblePace;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

function build(): CustomElementConstructor {
  const element = class KyuubuScramble extends HTMLElement {
    static observedAttributes = [...SCRAMBLE_ELEMENT_ATTRIBUTES];
    private view: CubeView | null = null;
    private loop: KeepScramblingHandle | null = null;
    private asked = true;

    connectedCallback(): void {
      this.draw();
    }

    disconnectedCallback(): void {
      this.undraw();
    }

    attributeChangedCallback(name: string): void {
      if (!this.isConnected) return;
      if (name === "pace") this.loop?.setPace(paceFromAttribute(this.getAttribute("pace")) ?? 1);
      else if (name === "paused") {
        if (this.hasAttribute("paused") && this.getAttribute("paused") !== "false") this.pause();
        else this.play();
      }
      else this.draw();
    }

    private undraw(): void {
      this.loop?.destroy();
      this.view?.host.replaceChildren();
      this.view = null;
      this.loop = null;
    }

    private draw(): void {
      this.undraw();
      if (this.style.display === "") this.style.display = "block";
      const has = (name: string) => this.hasAttribute(name) && this.getAttribute(name) !== "false" && this.getAttribute(name) !== "0";
      const scale = this.getAttribute("scale");
      const theme = this.getAttribute("theme");
      const width = Number(this.getAttribute("width"));
      const seed = this.getAttribute("seed");
      this.asked = !has("paused");
      this.view = new CubeView(this, {
        size: this.hasAttribute("size") ? Number(this.getAttribute("size")) : 3,
        scale: isCubeScale(scale) ? scale : undefined,
        width: width > 0 ? width : undefined,
        theme: theme !== null && theme in CUBE_THEMES ? CUBE_THEMES[theme as keyof typeof CUBE_THEMES] : undefined,
        interactive: this.hasAttribute("interactive") ? has("interactive") : undefined,
        keyboard: "none",
        locale: this.hasAttribute("lang") ? languageOf(this.getAttribute("lang")) : undefined,
      });
      this.loop = keepScrambling(this.view, {
        pace: paceFromAttribute(this.getAttribute("pace")),
        faces: has("faces"),
        random: seed === null ? undefined : seededRandom(seed),
        autoplay: this.asked,
      });
    }

    play(): void {
      this.asked = true;
      this.loop?.start();
    }
    pause(): void {
      this.asked = false;
      this.loop?.stop();
    }
    get running(): boolean {
      return this.loop?.running ?? false;
    }
    get cube(): CubeView | null {
      return this.view;
    }
  };
  reflectAttributes(element, SCRAMBLE_ELEMENT_ATTRIBUTES, { flags: ["paused", "faces", "interactive"] });
  return element;
}

/** Every scale the element takes, for a page that lists them. */
export const SCRAMBLE_ELEMENT_SCALES: readonly CubeScale[] = CUBE_SCALES;

/**
 * Register `<kyuubu-scramble>`, once. Where there is no browser, or the name
 * is already taken, it does nothing.
 */
export function defineScramble(name: string = SCRAMBLE_ELEMENT_NAME): void {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") return;
  if (customElements.get(name) !== undefined) return;
  made ??= build();
  customElements.define(name, name === SCRAMBLE_ELEMENT_NAME ? made : class extends made {});
}
