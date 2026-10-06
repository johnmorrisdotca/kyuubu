import { describe, expect, it } from "vitest";

import { FORMATS, MAKERS, allCode, attributesFor, codeFor, entriesFor, fromAddress, toAddress } from "../demo/builder-code.js";
import { CUBE_OPTIONS } from "../src/index.ts";

/** A choice that is not what leaving it out is, for any kind of option. */
function other(option) {
  if (option.kind === "boolean") return !option.default;
  if (option.kind === "number") return option.range.max === Number(option.default) ? option.range.min : option.range.max;
  if (option.kind === "choice") return option.choices.find((choice) => choice !== String(option.default));
  if (option.kind === "colour") return "#123456";
  if (option.kind === "moves") return "R2 U2";
  return "words";
}
const everything = Object.fromEntries(CUBE_OPTIONS.map((option) => [option.id, other(option)]));
const applies = (maker) => CUBE_OPTIONS.filter((option) => option.names[MAKERS[maker].names] !== undefined || (MAKERS[maker].element !== undefined && option.names[MAKERS[maker].element] !== undefined));

describe("the code the builder writes", () => {
  it("is written for every format of every way of making a cube, and for no other", () => {
    for (const maker of Object.keys(MAKERS)) {
      const code = allCode(maker, CUBE_OPTIONS, {});
      expect(Object.keys(code), maker).toEqual(MAKERS[maker].formats);
      for (const [format, text] of Object.entries(code)) {
        expect(text, `${maker} ${format}`).toEqual(expect.any(String));
        expect(text.length, `${maker} ${format}`).toBeGreaterThan(30);
        expect(text, `${maker} ${format}`).not.toMatch(/undefined|\[object|NaN/);
        expect(FORMATS[format], format).toBeDefined();
      }
    }
    expect(codeFor("view", "iframe", CUBE_OPTIONS, {})).toBeNull();
    expect(codeFor("view", "element", CUBE_OPTIONS, {})).toBeNull();
  });

  it("has every choice that is set in every format that can hold it: a new option is written by being a row of the list", () => {
    for (const maker of Object.keys(MAKERS)) {
      const settings = Object.fromEntries(applies(maker).map((option) => [option.id, everything[option.id]]));
      for (const format of MAKERS[maker].formats) {
        const text = codeFor(maker, format, CUBE_OPTIONS, settings);
        const byAttribute = maker === "turning" || (maker === "player" && format !== "module");
        const names = byAttribute ? attributesFor(CUBE_OPTIONS, settings, maker).map(([name]) => name) : entriesFor(CUBE_OPTIONS, settings, maker).map((entry) => entry.name.split(".")[0]);
        expect(names.length, `${maker} ${format}`).toBeGreaterThan(2);
        for (const name of names) {
          // An option is written by its name where the format has a name for it, and the iframe's address says it too.
          expect(text, `${maker} ${format}: ${name}`).toContain(name);
        }
        // And its value, as the format spells it.
        const pairs = byAttribute ? attributesFor(CUBE_OPTIONS, settings, maker).filter(([, value]) => value !== "" && value !== "false") : entriesFor(CUBE_OPTIONS, settings, maker).map((entry) => [entry.name, String(entry.value)]);
        for (const [name, value] of pairs) {
          const spelled = format === "iframe" ? encodeURIComponent(value).replaceAll("%20", "+").replaceAll("%27", "'").replaceAll("&", "&amp;") : value;
          expect(text, `${maker} ${format}: ${name} = ${value}`).toContain(spelled);
        }
      }
    }
  });

  it("writes nothing for a choice that is what leaving it out would be, bar what a cube cannot do without", () => {
    const standing = Object.fromEntries(CUBE_OPTIONS.filter((option) => option.default !== undefined).map((option) => [option.id, option.default]));
    expect(codeFor("view", "module", CUBE_OPTIONS, standing)).toContain("{ size: 3 }");
    expect(codeFor("view", "module", CUBE_OPTIONS, standing)).not.toContain("turnMs");
    const player = codeFor("player", "element", CUBE_OPTIONS, standing);
    expect(player).toContain('scramble="R U R\' U\'"');
    expect(player).not.toContain("autoplay");
    expect(player).not.toContain("controls");
    expect(player).not.toContain("readout");
  });

  it("says a flag that is on by default as \"false\" and one that is off by default by being there", () => {
    const text = codeFor("player", "element", CUBE_OPTIONS, { autoplay: true, controls: false, readout: false, "move-list": false, "animate-scrub": false });
    expect(text).toContain(" autoplay");
    expect(text).not.toContain('autoplay="');
    expect(text).toContain('controls="false"');
    expect(text).toContain('readout="false"');
    expect(text).toContain('movelist="false"');
    expect(text).toContain('scrub="false"');
    const iframe = codeFor("player", "iframe", CUBE_OPTIONS, { autoplay: true, controls: false, "animate-scrub": false });
    expect(iframe).toContain("autoplay=1");
    expect(iframe).toContain("controls=0");
    expect(iframe).toContain("scrub=0");
    expect(codeFor("player", "react", CUBE_OPTIONS, { controls: false })).toContain("controls={false}");
  });

  it("gives the time in seconds to an element and an address, and in milliseconds to the player", () => {
    const settings = { time: 3.13, scramble: "R U", solution: "U' R'" };
    expect(codeFor("player", "element", CUBE_OPTIONS, settings)).toContain('time="3.13"');
    expect(codeFor("player", "iframe", CUBE_OPTIONS, settings)).toContain("time=3.13");
    expect(codeFor("player", "module", CUBE_OPTIONS, settings)).toContain("timeMs: 3130");
    expect(codeFor("player", "module", CUBE_OPTIONS, settings)).toContain(`solution: "U' R'"`);
    expect(codeFor("player", "iframe", CUBE_OPTIONS, settings)).toContain("moves=U'+R'");
  });

  it("writes the themes by their objects where there is code, and by name where there is an attribute, and a colour as its own", () => {
    expect(codeFor("view", "module", CUBE_OPTIONS, { theme: "paper", "colour-up": "#ff00aa" })).toMatch(/import \{ CubeView, CUBE_THEMES \}[\s\S]*theme: CUBE_THEMES\.paper[\s\S]*colours: \{ U: "#ff00aa" \}/);
    expect(codeFor("view", "react", CUBE_OPTIONS, { theme: "paper" })).toContain("theme={CUBE_THEMES.paper}");
    expect(codeFor("player", "element", CUBE_OPTIONS, { theme: "paper" })).toContain('theme="paper"');
    const turning = codeFor("turning", "element", CUBE_OPTIONS, { theme: "stickerless", scale: "small", pace: "slow" });
    for (const one of ['theme="stickerless"', 'scale="small"', 'pace="slow"']) expect(turning).toContain(one);
  });

  it("is a choice that can be shared: the address says it, and reads back as it", () => {
    for (const maker of Object.keys(MAKERS)) {
      const settings = Object.fromEntries(applies(maker).map((option) => [option.id, everything[option.id]]));
      const address = toAddress(maker, CUBE_OPTIONS, settings);
      const back = fromAddress(`#${address}`, CUBE_OPTIONS);
      expect(back.maker).toBe(maker);
      expect(back.settings, maker).toEqual(settings);
      expect(codeFor(maker, MAKERS[maker].formats[0], CUBE_OPTIONS, back.settings)).toBe(codeFor(maker, MAKERS[maker].formats[0], CUBE_OPTIONS, settings));
    }
    expect(toAddress("view", CUBE_OPTIONS, {})).toBe("make=view");
    expect(fromAddress("#make=nonsense&size=abc&theme=nope&turn-ms=80", CUBE_OPTIONS)).toEqual({ maker: "view", settings: { "turn-ms": 80 } });
  });
});
