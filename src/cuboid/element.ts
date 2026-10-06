import { reflectAttributes } from "../reflect.ts";
import type { ReplayStatus } from "../replay.ts";
import { CUBE_THEMES } from "../view/view.ts";
import { languageOf } from "../words.ts";

import { mountCuboidPlayer, type CuboidPlayerHandle } from "./play.ts";
import { parseCuboidDims, type CuboidDims } from "./model.ts";

/**
 * THE CUBOID PLAYER AS A CUSTOM ELEMENT, for a page with no framework and for
 * one with any:
 *
 *     <kyuubu-cuboid dims="3x3x1" scramble="U2 R2" moves="R2 U2" time="2.5" controls autoplay></kyuubu-cuboid>
 *
 * `defineCuboid()` registers it; importing `@johnmorrisdotca/kyuubu/cuboid/element/define`
 * does that by itself, which is all a script tag needs. `dims` is `3x3x1`,
 * `3×3×1`, `3 3 1` or `3,3,1`, and 3×3×3 where it is left out. It is drawn in
 * the page's own document, so the page's CSS custom properties dress it.
 * Importing this file where there is no browser does nothing and throws nothing.
 */

/** The attributes the element reads. Changing any draws the player afresh. */
export const CUBOID_ELEMENT_ATTRIBUTES = ["dims", "scramble", "moves", "time", "autoplay", "controls", "loop", "speed", "theme", "lang", "readout", "movelist", "scrub"] as const;

/** The name the element is registered under. */
export const CUBOID_ELEMENT_NAME = "kyuubu-cuboid";

/**
 * What the element adds to an ordinary one. Every attribute is also a property
 * that writes it, as React, Vue and Svelte set them: reading gives the text of
 * the attribute, or `null`, and a flag (`autoplay`, `controls`, `loop`, `readout`, `movelist`, `scrub`) reads as a boolean.
 */
export type KyuubuCuboidElement = HTMLElement & {
  get dims(): string | null;
  set dims(value: string | number | boolean | null | undefined);
  get scramble(): string | null;
  set scramble(value: string | number | boolean | null | undefined);
  get moves(): string | null;
  set moves(value: string | number | boolean | null | undefined);
  get time(): string | null;
  set time(value: string | number | boolean | null | undefined);
  get autoplay(): boolean;
  set autoplay(value: boolean | string | null | undefined);
  get controls(): boolean;
  set controls(value: boolean | string | null | undefined);
  get loop(): boolean;
  set loop(value: boolean | string | null | undefined);
  get speed(): string | null;
  set speed(value: string | number | boolean | null | undefined);
  get theme(): string | null;
  set theme(value: string | number | boolean | null | undefined);
  get readout(): boolean;
  set readout(value: boolean | string | null | undefined);
  get movelist(): boolean;
  set movelist(value: boolean | string | null | undefined);
  get scrub(): boolean;
  set scrub(value: boolean | string | null | undefined);
  play(): void;
  pause(): void;
  step(by: 1 | -1): void;
  seek(position: number): void;
  restart(): void;
  readonly status: ReplayStatus | null;
};

let made: CustomElementConstructor | null = null;

function build(): CustomElementConstructor {
  const element = class KyuubuCuboid extends HTMLElement {
    static observedAttributes = [...CUBOID_ELEMENT_ATTRIBUTES];
    private player: CuboidPlayerHandle | null = null;

    connectedCallback(): void {
      this.draw();
    }

    disconnectedCallback(): void {
      this.player?.destroy();
      this.player = null;
    }

    attributeChangedCallback(): void {
      if (this.isConnected) this.draw();
    }

    private draw(): void {
      this.player?.destroy();
      if (this.style.display === "") this.style.display = "block";
      const has = (name: string) => this.hasAttribute(name) && this.getAttribute(name) !== "false" && this.getAttribute(name) !== "0";
      const time = Number(this.getAttribute("time"));
      const speed = Number(this.getAttribute("speed"));
      const theme = this.getAttribute("theme");
      const dims = this.hasAttribute("dims") ? parseCuboidDims(this.getAttribute("dims") ?? "") : ([3, 3, 3] as const);
      this.player = mountCuboidPlayer(this, {
        // A `dims` that is not a cuboid reaches the player as it is, which tells the viewer so.
        dims: (dims ?? [0, 0, 0]) as CuboidDims,
        scramble: this.getAttribute("scramble") ?? "",
        solution: this.getAttribute("moves") ?? "",
        timeMs: time > 0 ? time * 1000 : undefined,
        autoplay: has("autoplay"),
        controls: !this.hasAttribute("controls") || has("controls"),
        loop: has("loop"),
        speed: speed > 0 ? speed : undefined,
        theme: theme !== null && theme in CUBE_THEMES ? CUBE_THEMES[theme as keyof typeof CUBE_THEMES] : undefined,
        readout: this.hasAttribute("readout") ? has("readout") : undefined,
        moveList: this.hasAttribute("movelist") ? has("movelist") : undefined,
        animateScrub: this.hasAttribute("scrub") ? has("scrub") : undefined,
        locale: this.hasAttribute("lang") ? languageOf(this.getAttribute("lang")) : undefined,
        onChange: (status) => this.dispatchEvent(new CustomEvent("kyuubu-step", { detail: status, bubbles: true })),
        onEnd: () => this.dispatchEvent(new CustomEvent("kyuubu-end", { bubbles: true })),
      });
    }

    play(): void {
      this.player?.play();
    }
    pause(): void {
      this.player?.pause();
    }
    step(by: 1 | -1): void {
      this.player?.step(by);
    }
    seek(position: number): void {
      this.player?.seek(position);
    }
    restart(): void {
      this.player?.restart();
    }
    get status(): ReplayStatus | null {
      return this.player?.status ?? null;
    }
  };
  reflectAttributes(element, CUBOID_ELEMENT_ATTRIBUTES, { flags: ["autoplay", "loop"], onByDefault: ["controls", "readout", "movelist", "scrub"] });
  return element;
}

/**
 * Register `<kyuubu-cuboid>`, once. Where there is no browser, or the name is
 * already taken, it does nothing. A page that wants another name passes it.
 */
export function defineCuboid(name: string = CUBOID_ELEMENT_NAME): void {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") return;
  if (customElements.get(name) !== undefined) return;
  made ??= build();
  customElements.define(name, name === CUBOID_ELEMENT_NAME ? made : class extends made {});
}
