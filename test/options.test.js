import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CUBOID_ELEMENT_ATTRIBUTES } from "../src/cuboid/element.ts";
import { CUBE_ELEMENT_ATTRIBUTES } from "../src/element.ts";
import { CUBE_OPTIONS, CUBE_OPTIONS_LEFT_OUT, CUBE_OPTION_GROUPS, CUBE_THEMES, REPLAY_SPEEDS } from "../src/index.ts";
import { SCRAMBLE_ELEMENT_ATTRIBUTES } from "../src/scramble-element.ts";

const read = (path) => readFileSync(path, "utf8");
/** The names a type's block declares: `  name?: …` at two spaces' depth, between its opening line and the line that ends it. */
const keysOf = (path, opening, closing = "\n};") => {
  const source = read(path);
  const from = source.indexOf(opening);
  expect(from, `${opening} in ${path}`).toBeGreaterThan(-1);
  const block = source.slice(from, source.indexOf(closing, from));
  return [...block.matchAll(/^ {2}(\w+)\??:/gm)].map((found) => found[1]);
};

const view = keysOf("src/view/view.ts", "export type CubeViewOptions = {");
const player = [...keysOf("src/player.ts", "export type PlayerOptions = ReplaySource & {"), ...keysOf("src/replay.ts", "export type ReplaySource = {")];
const cuboid = keysOf("src/cuboid/draw.ts", "export type CuboidViewOptions = {");
const cuboidPlayer = [...keysOf("src/cuboid/play.ts", "export type CuboidPlayerOptions = CuboidReplaySource & {"), ...keysOf("src/cuboid/replay.ts", "export type CuboidReplaySource = {")];
const names = (maker) => CUBE_OPTIONS.flatMap((option) => (option.names[maker] === undefined ? [] : [option.names[maker]]));

describe("the choices the package offers", () => {
  it("has every option of the view, and what it leaves out it says why", () => {
    expect(view.length).toBeGreaterThan(15);
    const named = new Set(names("view").map((name) => name.split(".")[0]));
    for (const name of view) expect(named.has(name) || `view.${name}` in CUBE_OPTIONS_LEFT_OUT, `view option ${name}`).toBe(true);
  });

  it("has every option of the player", () => {
    expect(player).toContain("autoplay");
    expect(player).toContain("animateScrub");
    const named = new Set(names("player"));
    for (const name of player) expect(named.has(name) || `player.${name}` in CUBE_OPTIONS_LEFT_OUT, `player option ${name}`).toBe(true);
  });

  it("has every attribute of both custom elements", () => {
    const cube = new Set(names("cube"));
    for (const name of CUBE_ELEMENT_ATTRIBUTES) expect(cube.has(name), `<kyuubu-cube ${name}>`).toBe(true);
    const turning = new Set(names("turning"));
    for (const name of SCRAMBLE_ELEMENT_ATTRIBUTES) expect(turning.has(name), `<kyuubu-scramble ${name}>`).toBe(true);
  });

  it("has every option of the cuboid's view and player, and of its custom element", () => {
    expect(cuboid).toContain("dims");
    expect(cuboidPlayer).toContain("dims");
    expect(cuboidPlayer).toContain("moveList");
    const viewNames = new Set(names("cuboid").map((name) => name.split(".")[0]));
    for (const name of cuboid) expect(viewNames.has(name) || `cuboid.${name}` in CUBE_OPTIONS_LEFT_OUT, `cuboid view option ${name}`).toBe(true);
    const playerNames = new Set(names("cuboidPlayer"));
    for (const name of cuboidPlayer) expect(playerNames.has(name) || `cuboidPlayer.${name}` in CUBE_OPTIONS_LEFT_OUT, `cuboid player option ${name}`).toBe(true);
    const element = new Set(names("cuboidElement"));
    for (const name of CUBOID_ELEMENT_ATTRIBUTES) expect(element.has(name), `<kyuubu-cuboid ${name}>`).toBe(true);
  });

  it("names nothing that is not there: every name a row gives is an option or an attribute", () => {
    const base = (name) => name.split(".")[0];
    for (const name of names("view")) expect(view, name).toContain(base(name));
    for (const name of names("player")) expect(player, name).toContain(name);
    for (const name of names("cube")) expect(CUBE_ELEMENT_ATTRIBUTES, name).toContain(name);
    for (const name of names("turning")) expect(SCRAMBLE_ELEMENT_ATTRIBUTES, name).toContain(name);
    for (const name of names("cuboid")) expect(cuboid, name).toContain(base(name));
    for (const name of names("cuboidPlayer")) expect(cuboidPlayer, name).toContain(name);
    for (const name of names("cuboidElement")) expect(CUBOID_ELEMENT_ATTRIBUTES, name).toContain(name);
  });

  it("gives every left-out name a reason, and every one is a name that is there", () => {
    for (const [name, why] of Object.entries(CUBE_OPTIONS_LEFT_OUT)) {
      expect(why.length, name).toBeGreaterThan(15);
      const [maker, option] = name.split(".");
      expect({ view, player, cuboid, cuboidPlayer }[maker], name).toContain(option);
    }
  });

  it("is a list with unique kebab-case ids, each in a group that has a name", () => {
    const ids = CUBE_OPTIONS.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const option of CUBE_OPTIONS) {
      expect(option.id, option.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(CUBE_OPTION_GROUPS[option.group].en, option.id).toEqual(expect.any(String));
      expect(CUBE_OPTION_GROUPS[option.group].ja, option.id).toEqual(expect.any(String));
      expect(Object.keys(option.names).length, option.id).toBeGreaterThan(0);
    }
  });

  it("says each in both languages, a label and one plain line, with nothing left to fill in", () => {
    for (const option of CUBE_OPTIONS) {
      for (const language of ["en", "ja"]) {
        const { label, help } = option.say[language];
        expect(label.trim(), `${option.id} ${language}`).not.toBe("");
        expect(help.trim().length, `${option.id} ${language}`).toBeGreaterThan(5);
        expect(label + help, option.id).not.toMatch(/[{}]/);
      }
    }
  });

  it("is a choice that can be made: a default among its choices, a range that holds it, a choice with choices", () => {
    for (const option of CUBE_OPTIONS) {
      if (option.kind === "choice") {
        expect(option.choices?.length, option.id).toBeGreaterThan(1);
        if (option.default !== undefined) expect(option.choices, option.id).toContain(String(option.default));
      }
      if (option.kind === "number") {
        expect(option.range, option.id).toBeDefined();
        if (option.default !== undefined) {
          expect(Number(option.default), option.id).toBeGreaterThanOrEqual(option.range.min);
          expect(Number(option.default), option.id).toBeLessThanOrEqual(option.range.max);
        }
      }
      if (option.kind === "boolean") expect(typeof option.default, option.id).toBe("boolean");
    }
  });

  it("agrees with the package on what it lists: the themes, the speeds and the defaults", () => {
    const by = (id) => CUBE_OPTIONS.find((option) => option.id === id);
    expect(by("theme").choices).toEqual(Object.keys(CUBE_THEMES));
    expect(by("speed").choices).toEqual(REPLAY_SPEEDS.map(String));
    expect(by("turn-ms").default).toBe(160);
    expect(by("commit-angle").default).toBe(30);
    expect(by("fill").default).toBe(0.9);
    expect(by("yaw").default).toBe(-35);
    expect(by("pitch").default).toBe(28);
    expect(by("keyboard").default).toBe("focus");
    expect(by("plastic").default).toBe("#111111");
    for (const option of CUBE_OPTIONS.filter((one) => one.names.view?.startsWith("colours."))) expect(option.kind).toBe("colour");
    expect(CUBE_OPTIONS.filter((one) => one.names.view?.startsWith("colours.")).map((one) => one.names.view)).toEqual(["U", "R", "F", "D", "L", "B"].map((letter) => `colours.${letter}`));
  });
});
