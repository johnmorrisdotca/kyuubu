import { describe, expect, it } from "vitest";

import { WORDS, moveName, parseSolve, planReplay } from "../src/index.ts";

const en = (code: string) => moveName(code);
const ja = (code: string) => moveName(code, "ja");

describe("what a move turns, in a few plain words", () => {
  it("names a face turned, the way round it goes", () => {
    expect(en("R")).toBe("Right face, clockwise");
    expect(en("R'")).toBe("Right face, anticlockwise");
    expect(en("R2")).toBe("Right face, twice");
    for (const [letter, side] of [["L", "Left"], ["U", "Top"], ["D", "Bottom"], ["F", "Front"], ["B", "Back"]] as const) {
      expect(en(letter)).toBe(`${side} face, clockwise`);
      expect(en(`${letter}'`)).toBe(`${side} face, anticlockwise`);
      expect(en(`${letter}2`)).toBe(`${side} face, twice`);
    }
  });

  it("names a wide turn by how many layers it takes", () => {
    expect(en("Rw")).toBe("Right two layers, clockwise");
    expect(en("Uw'")).toBe("Top two layers, anticlockwise");
    expect(en("Fw2")).toBe("Front two layers, twice");
    expect(en("3Rw")).toBe("Right three layers, clockwise");
    expect(en("4Lw'")).toBe("Left four layers, anticlockwise");
    expect(en("5Bw")).toBe("Back five layers, clockwise");
    expect(en("6Dw2")).toBe("Bottom six layers, twice");
    expect(en("7Rw")).toBeNull();
  });

  it("names a layer inside a big cube by how far in it is", () => {
    expect(en("2R")).toBe("Right layer 2, clockwise");
    expect(en("3U'")).toBe("Top layer 3, anticlockwise");
    expect(en("4F2")).toBe("Front layer 4, twice");
    expect(en("1R")).toBeNull();
  });

  it("names the slices by the face they follow, and a half turn by no way round", () => {
    expect(en("M")).toBe("Middle slice, same way as Left clockwise");
    expect(en("M'")).toBe("Middle slice, same way as Left anticlockwise");
    expect(en("M2")).toBe("Middle slice, twice");
    expect(en("E")).toBe("Equator slice, same way as Bottom clockwise");
    expect(en("E'")).toBe("Equator slice, same way as Bottom anticlockwise");
    expect(en("E2")).toBe("Equator slice, twice");
    expect(en("S")).toBe("Standing slice, same way as Front clockwise");
    expect(en("S'")).toBe("Standing slice, same way as Front anticlockwise");
    expect(en("S2")).toBe("Standing slice, twice");
  });

  it("names a turn of the whole cube by its axis", () => {
    for (const axis of ["x", "y", "z"]) {
      expect(en(axis)).toBe(`Whole cube on ${axis}, clockwise`);
      expect(en(`${axis}'`)).toBe(`Whole cube on ${axis}, anticlockwise`);
      expect(en(`${axis}2`)).toBe(`Whole cube on ${axis}, twice`);
    }
  });

  it("says the same in Japanese, with every kind of move", () => {
    expect(ja("R'")).toBe("右の面、反時計回り");
    expect(ja("U2")).toBe("上の面、2回");
    expect(ja("Rw")).toBe("右の2層、時計回り");
    expect(ja("3Fw'")).toBe("前の3層、反時計回り");
    expect(ja("2L")).toBe("左から2層目、時計回り");
    expect(ja("M")).toBe("中の層（左右の間）、左の時計回りと同じ向き");
    expect(ja("S2")).toBe("中の層（前後の間）、2回");
    expect(ja("x2")).toBe("キューブ全体をx軸で、2回");
  });

  it("is nothing for what is not a move in standard form", () => {
    for (const text of ["", "Q", "R3", "r", "rw", "Rww", "RR", "R2'", "[r]", "m", "0R", "8R", "x3", "Rw3"]) expect(moveName(text), text).toBeNull();
  });

  it("names every step a solve is written down with, in both languages, with no brace left over", () => {
    const text = "x2 R' D2 R' D L' U L D R' U' R D L U' L' U' R U R' y' U R' U' R Rw' U' R U' R' U2 Rw U M' E S2 3Uw 2R F B' z'";
    const read = parseSolve(text, 5);
    expect(read.ok).toBe(true);
    for (const step of read.steps) {
      for (const language of ["en", "ja"] as const) {
        const said = moveName(step.text, language);
        expect(said, step.text).toEqual(expect.any(String));
        expect(said, step.text).not.toMatch(/[{}]/);
      }
    }
  });

  it("names what a plan's steps are, written as the plan writes them", () => {
    const planned = planReplay({ scramble: "R U", solution: "U' R'", size: 3 });
    expect(planned.ok && planned.plan.steps.map((step) => moveName(step.text))).toEqual(["Top face, anticlockwise", "Right face, anticlockwise"]);
  });

  it("has every word it needs in both languages", () => {
    for (const language of ["en", "ja"] as const) for (const key of Object.keys(WORDS[language]).filter((one) => one.startsWith("move"))) expect(WORDS[language][key as keyof typeof WORDS.en], key).not.toBe("");
  });
});
