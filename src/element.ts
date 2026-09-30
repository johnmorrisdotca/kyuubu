import { mountPlayer, type PlayerHandle } from "./player.ts";
import type { ReplayStatus } from "./replay.ts";
import { CUBE_THEMES } from "./view/view.ts";
import { languageOf } from "./words.ts";

/**
 * THE PLAYER AS A CUSTOM ELEMENT, for a page with no framework and for one
 * with any:
 *
 *     <kyuubu-cube scramble="R U R' U'" moves="U R U' R'" time="2.5" controls autoplay></kyuubu-cube>
 *
 * `defineCube()` registers it; importing `@johnmorrisdotca/kyuubu/element/define`
 * does that by itself, which is all a script tag needs. It is drawn in the
 * page's own document, so the page's CSS custom properties dress it.
 * Importing this file where there is no browser does nothing and throws
 * nothing.
 */

/** The attributes the element reads. Changing any draws the player afresh. */
export const CUBE_ELEMENT_ATTRIBUTES = ["size", "scramble", "moves", "time", "autoplay", "controls", "loop", "speed", "theme", "lang"] as const;

/** The name the element is registered under. */
export const CUBE_ELEMENT_NAME = "kyuubu-cube";

/** What the element adds to an ordinary one. */
export type KyuubuCubeElement = HTMLElement & {
  play(): void;
  pause(): void;
  step(by: 1 | -1): void;
  seek(position: number): void;
  restart(): void;
  readonly status: ReplayStatus | null;
};

let made: CustomElementConstructor | null = null;

function build(): CustomElementConstructor {
  return class KyuubuCube extends HTMLElement {
    static observedAttributes = [...CUBE_ELEMENT_ATTRIBUTES];
    private player: PlayerHandle | null = null;

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
      this.player = mountPlayer(this, {
        size: this.hasAttribute("size") ? Number(this.getAttribute("size")) : 3,
        scramble: this.getAttribute("scramble") ?? "",
        solution: this.getAttribute("moves") ?? "",
        timeMs: time > 0 ? time * 1000 : undefined,
        autoplay: has("autoplay"),
        controls: !this.hasAttribute("controls") || has("controls"),
        loop: has("loop"),
        speed: speed > 0 ? speed : undefined,
        theme: theme !== null && theme in CUBE_THEMES ? CUBE_THEMES[theme as keyof typeof CUBE_THEMES] : undefined,
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
}

/**
 * Register `<kyuubu-cube>`, once. Where there is no browser, or the name is
 * already taken, it does nothing. A page that wants another name passes it.
 */
export function defineCube(name: string = CUBE_ELEMENT_NAME): void {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") return;
  if (customElements.get(name) !== undefined) return;
  made ??= build();
  customElements.define(name, name === CUBE_ELEMENT_NAME ? made : class extends made {});
}
