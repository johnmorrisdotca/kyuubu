import { describe, expect, it } from "vitest";

import { reflectAttributes } from "../src/reflect.ts";

/** Just enough of an element to hold attributes. */
class Fake {
  attributes = new Map<string, string>();
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  step(): string {
    return "stepped";
  }
}
/** The browser's own accessor, which refuses a prototype for a receiver, as `HTMLElement.prototype.lang` does. */
Object.defineProperty(Fake.prototype, "lang", {
  configurable: true,
  get(this: unknown) {
    if (!(this instanceof Fake)) throw new TypeError("not an element");
    return "native";
  },
});

describe("reflectAttributes", () => {
  class Thing extends Fake {}
  reflectAttributes(Thing, ["size", "step", "lang", "autoplay", "controls"], { flags: ["autoplay"], onByDefault: ["controls"] });
  const thing = () => new Thing() as unknown as Record<string, unknown> & Fake;

  it("writes the attribute from a property, and reads its text", () => {
    const one = thing();
    expect(one.size).toBeNull();
    one.size = 4;
    expect(one.getAttribute("size")).toBe("4");
    expect(one.size).toBe("4");
    one.size = null;
    expect(one.getAttribute("size")).toBeNull();
  });

  it("makes a flag a boolean, off by false, and one that is on by default off by writing false", () => {
    const one = thing();
    expect([one.autoplay, one.controls]).toEqual([false, true]);
    one.autoplay = true;
    one.controls = false;
    expect([one.getAttribute("autoplay"), one.getAttribute("controls"), one.autoplay, one.controls]).toEqual(["", "false", true, false]);
    one.autoplay = false;
    one.controls = true;
    expect([one.getAttribute("autoplay"), one.getAttribute("controls"), one.controls]).toEqual([null, "", true]);
    one.controls = undefined;
    expect([one.getAttribute("controls"), one.controls]).toEqual([null, true]);
  });

  it("leaves a method a method, and a name the browser already has as the browser has it", () => {
    const one = thing();
    expect(one.step).toBeTypeOf("function");
    expect((one.step as () => string)()).toBe("stepped");
    (one as Record<string, unknown>).step = "fast";
    expect(one.getAttribute("step")).toBe("fast");
    expect(one.step).toBeTypeOf("function");
    expect(one.lang).toBe("native");
    expect(Object.getOwnPropertyDescriptor(Thing.prototype, "lang")).toBeUndefined();
  });
});
