/** How the attributes of a custom element are also its properties. */
export type ReflectedAttributes = {
  /** Names read as true when present, unless they say "false" or "0": `autoplay`, `loop`. */
  flags?: readonly string[];
  /** The flags that are on when absent (`controls`), so that off has to be written as "false". */
  onByDefault?: readonly string[];
};

/**
 * LET A FRAMEWORK SET ANY ATTRIBUTE AS A PROPERTY. React 19, Vue 3 and Svelte 5
 * set a property, not an attribute, on a custom element that has one of the
 * name (`<kyuubu-cube size={4}>` is `cube.size = 4`), and fall back to the
 * attribute only when there is none. This gives every observed attribute a
 * property that writes the attribute, so the element is drawn the same way
 * from markup, from `setAttribute` and from a framework, and a name that is a
 * method as well goes on being the method. Writing `true` or `""` turns a flag
 * on; `false`, `null` and `undefined` turn it off; any other value is the
 * attribute's text, so a number is fine. Reading gives the attribute's text (or
 * `null`), and a flag reads as a boolean. A name the browser already gives
 * every element, such as `lang`, is left as the browser has it.
 */
export function reflectAttributes(element: { prototype: object }, names: readonly string[], { flags = [], onByDefault = [] }: ReflectedAttributes = {}): void {
  const prototype = element.prototype;
  for (const name of names) {
    const existing = describe(prototype, name);
    // Read the descriptor, never the property: a browser's own getter refuses a prototype for a receiver.
    const method = typeof existing?.value === "function" ? (existing.value as unknown) : undefined;
    if (existing !== undefined && method === undefined) continue;
    const flag = flags.includes(name) || onByDefault.includes(name);
    Object.defineProperty(prototype, name, {
      configurable: true,
      get(this: Element) {
        if (method !== undefined) return method;
        const text = this.getAttribute(name);
        if (!flag) return text;
        if (text === null) return onByDefault.includes(name);
        return text !== "false" && text !== "0";
      },
      set(this: Element, value: unknown) {
        if (value === null || value === undefined) this.removeAttribute(name);
        else if (value === false && !onByDefault.includes(name)) this.removeAttribute(name);
        else if (value === false) this.setAttribute(name, "false");
        else this.setAttribute(name, value === true ? "" : String(value));
      },
    });
  }
}

/** What an object or anything it inherits from has under a name, if anything. */
function describe(object: object, name: string): PropertyDescriptor | undefined {
  for (let at: object | null = object; at !== null; at = Object.getPrototypeOf(at) as object | null) {
    const found = Object.getOwnPropertyDescriptor(at, name);
    if (found !== undefined) return found;
  }
  return undefined;
}
