// One cloth list across the family: the package's own table is held to the family's by this test.
import { describe, expect, it } from "vitest";

import { FAMILY_CLOTHS } from "../scripts/family-template.mjs";
import { clothVars, isCloth, KYUUBU_CLOTHS } from "../src/cloth.ts";

describe("the cloths", () => {
  it("are the family's five, colour for colour", () => {
    expect(KYUUBU_CLOTHS).toEqual(FAMILY_CLOTHS);
  });
  it("name only what is a cloth, and a name that is not one changes nothing", () => {
    expect(isCloth("wood")).toBe(true);
    expect(isCloth("toString")).toBe(false);
    expect(clothVars("nothing")).toEqual({});
    expect(clothVars("blue")["--kyuubu-player-felt"]).toBe(KYUUBU_CLOTHS.blue.felt);
  });
});
