import { describe, expect, it } from "vitest";

import { SOLVE_ALGORITHMS, STRINGS, WORDS, algorithmName, fill, languageOf, stageName, stageSays, type SolveAlgorithm, type SolveStage } from "../src/index.ts";

const STAGES: SolveStage[] = ["hold", "whiteCross", "whiteCorners", "whiteLayer", "middleLayer", "yellowCross", "yellowFace", "yellowCorners", "yellowEdges"];

describe("the package's words", () => {
  it("has a Japanese line for every English one, and keeps every place to fill in", () => {
    expect(Object.keys(STRINGS.ja)).toEqual(Object.keys(STRINGS.en));
    const places = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((found) => found[1]))].sort();
    for (const key of Object.keys(STRINGS.en) as (keyof typeof STRINGS.en)[]) {
      expect(places(STRINGS.ja[key]), key).toEqual(places(STRINGS.en[key]));
      expect(STRINGS.ja[key].trim(), key).not.toBe("");
    }
  });

  it("is the cube's words and the command line's, together", () => {
    for (const language of ["en", "ja"] as const) {
      expect(STRINGS[language]).toMatchObject(WORDS[language]);
      expect(Object.keys(STRINGS[language]).filter((key) => !(key in WORDS[language])).every((key) => key.startsWith("cli"))).toBe(true);
    }
  });

  it("names every step of the solve and says what it is for, in both languages", () => {
    for (const stage of STAGES) {
      for (const language of ["en", "ja"] as const) {
        expect(stageName(stage, language), stage).toEqual(expect.any(String));
        expect(stageSays(stage, language).length, stage).toBeGreaterThan(5);
      }
    }
    expect(stageName("whiteCross")).toBe("White cross");
    expect(stageName("whiteCross", "ja")).toBe("白のクロス");
    expect(stageSays("yellowCross")).toBe("Make a yellow cross on the top.");
  });

  it("names every algorithm, in both languages", () => {
    for (const name of Object.keys(SOLVE_ALGORITHMS) as SolveAlgorithm[]) {
      expect(algorithmName(name), name).toEqual(expect.any(String));
      expect(algorithmName(name, "ja"), name).toEqual(expect.any(String));
    }
    expect(algorithmName("sune")).toBe("Sune");
  });

  it("fills the braces it is given and leaves the rest", () => {
    expect(fill(WORDS.en.cubeLabel, { n: 3 })).toBe("A 3×3 cube");
    expect(fill(WORDS.ja.cubeLabel, { n: 4 })).toBe("4×4のキューブ");
    expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });

  it("reads a language tag", () => {
    expect([languageOf("ja"), languageOf("ja-JP"), languageOf("JA_jp.UTF-8"), languageOf("en-GB"), languageOf("fr"), languageOf(""), languageOf(null), languageOf(undefined)]).toEqual(["ja", "ja", "ja", "en", "en", "en", "en", "en"]);
  });
});
