/** The player's stylesheet, put in the page once.
 *
 * @example
 * ```ts
 * import { PLAYER_CSS } from "@johnmorrisdotca/kyuubu/player";
 *
 * console.log(PLAYER_CSS.includes("."));
 * ```
 */
export const PLAYER_CSS = `
.kyuubu-player{display:grid;gap:.5rem;font:inherit;color:inherit;max-width:100%}
.kyuubu-player-cube{aspect-ratio:1;width:100%;position:relative;background:var(--kyuubu-player-felt,transparent);border-radius:var(--kyuubu-player-radius,12px);touch-action:none}
.kyuubu-player-row{display:flex;flex-wrap:wrap;gap:.375rem;align-items:center}
.kyuubu-player button{touch-action:manipulation;font:inherit;color:inherit;min-height:44px;min-width:44px;padding:0 .75rem;border-radius:999px;border:1px solid var(--kyuubu-player-rule,color-mix(in srgb,currentColor 28%,transparent));background:var(--kyuubu-player-button,transparent);cursor:pointer}
.kyuubu-player button[aria-pressed="true"],.kyuubu-player button[data-main]{background:var(--kyuubu-player-ink,currentColor);border-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-player button[aria-pressed="true"]>span,.kyuubu-player button[data-main]>span{color:var(--kyuubu-player-paper,Canvas);mix-blend-mode:normal}
.kyuubu-player button:focus-visible,.kyuubu-player input:focus-visible{outline:2px solid var(--kyuubu-player-focus,Highlight);outline-offset:2px}
.kyuubu-player input[type=range]{flex:1 1 8rem;min-height:44px;accent-color:var(--kyuubu-player-ink,currentColor)}
.kyuubu-player-at{font-variant-numeric:tabular-nums;font-size:.875em;opacity:.8;margin-inline-start:auto}
.kyuubu-player-note{font-size:.8125em;opacity:.75;margin:0}
.kyuubu-player-note[data-tone="bad"]{opacity:1;font-weight:600}
.kyuubu-player-guide{padding:.25rem 0}
.kyuubu-player-credit{font-size:.75em;opacity:.7;color:inherit;margin-inline-start:auto}
.kyuubu-player-readout{display:flex;align-items:center;gap:.75rem;min-height:3.75rem}
.kyuubu-player-code{flex:none;box-sizing:border-box;min-width:4.6ch;padding:.35rem .5rem;border-radius:12px;border:2px solid var(--kyuubu-player-ink,currentColor);font:700 2.25rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-ligatures:none;text-align:center}
.kyuubu-player-says{display:grid;gap:.125rem;min-width:0;font-weight:600}
.kyuubu-player-says small{min-height:1.25em;font-size:.8125rem;font-weight:400;opacity:.8}
.kyuubu-player-live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;
