// The code a builder page shows: one cube, as every way a page can have it. Pure functions from the package's own
// list of choices (`CUBE_OPTIONS`) and the choices made, so a new option is written into every piece of code by
// being a row in that list, and nothing here names an option. Nothing in this file touches the page.
//
// To use it in another package: give `makers` that package's ways of making a thing (what to import, what to call,
// which formats it has), and the list of its choices in the same shape; everything else is here.

/** The package, as a page imports it. */
export const PACKAGE = "@johnmorrisdotca/kyuubu";
/** The element script a page with no build step loads. */
export const CDN = `https://cdn.jsdelivr.net/npm/${PACKAGE}@1/dist/element-define.js`;
/** Where the embed pages are. */
export const SITE = "https://johnmorrisdotca.github.io/kyuubu/";

/**
 * The three ways a cube is made, and the codes each can be written as. `names` is the key of an option's `names` that
 * the way reads; an element is read through `cube` or `turning`, a call through `view` or `player`.
 */
export const MAKERS = {
  view: { names: "view", formats: ["module", "react", "vue", "svelte", "angular"] },
  player: { names: "player", element: "cube", tag: "kyuubu-cube", embed: "embed.html", formats: ["element", "module", "iframe", "react", "vue", "svelte", "angular"] },
  turning: { names: "turning", element: "turning", tag: "kyuubu-scramble", embed: "embed-scramble.html", formats: ["element", "module", "iframe", "react", "vue", "svelte", "angular"] },
};

/** What each format is called, and the language its code is in. */
export const FORMATS = {
  element: { label: { en: "Custom element", ja: "カスタム要素" }, language: "html" },
  module: { label: { en: "ES module", ja: "ESモジュール" }, language: "js" },
  iframe: { label: { en: "iframe", ja: "iframe" }, language: "html" },
  react: { label: { en: "React", ja: "React" }, language: "tsx" },
  vue: { label: { en: "Vue", ja: "Vue" }, language: "vue" },
  svelte: { label: { en: "Svelte", ja: "Svelte" }, language: "svelte" },
  angular: { label: { en: "Angular", ja: "Angular" }, language: "ts" },
};

/** The options that a player cannot do without, given even when they are what they would be left out. */
const REQUIRED = { view: ["size"], player: ["scramble", "solution"] };

const quote = (text) => JSON.stringify(String(text));
const plain = (value) => (typeof value === "string" ? quote(value) : String(value));

/** Whether a choice is as good as not made: it is what leaving it out is, or it is empty. */
function standing(option, value) {
  if (value === undefined || value === null || value === "") return true;
  if (option.default === undefined) return false;
  if (option.kind === "number") return Number(value) === Number(option.default);
  if (option.kind === "boolean") return Boolean(value) === Boolean(option.default);
  return String(value).toLowerCase() === String(option.default).toLowerCase();
}

/**
 * The choices that count for one way of making a cube, in the order of the list: each with the name that way calls
 * it, and its value as that way takes it (a number as a number, `time` in the player's milliseconds).
 */
export function entriesFor(options, settings, maker) {
  const spec = MAKERS[maker];
  const out = [];
  for (const option of options) {
    const name = option.names[spec.names];
    if (name === undefined) continue;
    const value = settings[option.id];
    const required = (REQUIRED[maker] ?? []).includes(option.id);
    if (standing(option, value) && !required) continue;
    const raw = value === undefined || value === "" ? option.default : value;
    if (raw === undefined) continue;
    out.push({ id: option.id, name, value: converted(option, raw, maker), option });
  }
  return out;
}

/** A choice's value as a call takes it: numbers as numbers (the time in the player's milliseconds), a flag as a boolean. */
function converted(option, raw, maker) {
  if (option.kind === "number") return Number((Number(raw) * (option.factor?.[maker] ?? 1)).toFixed(6));
  if (option.kind === "boolean") return Boolean(raw);
  if (option.choices?.every((choice) => /^[0-9.]+$/.test(choice))) return Number(raw);
  return raw;
}

/** An element's attributes for the choices: a flag that is on by default is written `"false"` to turn it off, one that is off by default is present to turn it on. */
export function attributesFor(options, settings, maker) {
  const spec = MAKERS[maker];
  const key = spec.element;
  const out = [];
  for (const option of options) {
    const name = option.names[key];
    if (name === undefined) continue;
    const value = settings[option.id];
    const required = (REQUIRED[maker] ?? []).includes(option.id);
    if (standing(option, value) && !required) continue;
    const raw = value === undefined || value === "" ? option.default : value;
    if (raw === undefined) continue;
    if (option.kind === "boolean") out.push([name, raw ? "" : "false"]);
    else out.push([name, String(raw)]);
  }
  return out;
}

/** `theme: CUBE_THEMES.paper`, `colours: { U: "#fff" }` and the rest, as the lines of an options object. */
function objectLines(entries, { themes = true } = {}) {
  const colours = entries.filter((entry) => entry.name.startsWith("colours."));
  const others = entries.filter((entry) => !entry.name.startsWith("colours."));
  const lines = others.map((entry) => (entry.name === "theme" && themes ? `theme: CUBE_THEMES.${entry.value}` : `${entry.name}: ${plain(entry.value)}`));
  if (colours.length > 0) lines.push(`colours: { ${colours.map((entry) => `${entry.name.slice(8)}: ${quote(entry.value)}`).join(", ")} }`);
  return lines;
}

/** An object literal, on one line while it fits, then a line to each entry. */
function literal(lines, indent = "") {
  const one = `{ ${lines.join(", ")} }`;
  return one.length + indent.length <= 78 ? one : `{\n${lines.map((line) => `${indent}  ${line},`).join("\n")}\n${indent}}`;
}

const usesThemes = (entries) => entries.some((entry) => entry.name === "theme");
const attr = ([name, value]) => (value === "" ? ` ${name}` : ` ${name}="${String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`);
const tagOf = (spec, attributes, indent = "") => {
  const text = `<${spec.tag}${attributes.map(attr).join("")}></${spec.tag}>`;
  if (text.length + indent.length <= 80 || attributes.length < 3) return text;
  return `<${spec.tag}\n${attributes.map((one) => `${indent}  ${attr(one).trim()}`).join("\n")}\n${indent}></${spec.tag}>`;
};
/** A JSX attribute: a string in quotes, anything else in braces. */
const jsx = ([name, value], option) => {
  if (value === "") return name;
  if (value === "false" && option?.kind === "boolean") return `${name}={false}`;
  return /^-?\d+(\.\d+)?$/.test(value) && option?.kind === "number" ? `${name}={${value}}` : `${name}=${quote(value)}`;
};

/** The address of an embed page, for the choices: every attribute as a parameter, a flag as `1` or `0`. */
export function embedAddress(options, settings, maker) {
  const spec = MAKERS[maker];
  const pairs = attributesFor(options, settings, maker).map(([name, value]) => {
    const option = options.find((one) => one.names[spec.element] === name);
    if (option?.kind === "boolean") return [name, value === "" ? "1" : "0"];
    return [name, value];
  });
  const hash = pairs.map(([name, value]) => `${name}=${encodeURIComponent(value).replaceAll("%20", "+").replaceAll("%27", "'")}`).join("&");
  return `${spec.embed}${hash === "" ? "" : `#${hash}`}`;
}

/** The side of the frame an embed is shown in, in pixels. */
export function frameSide(maker, settings) {
  const width = Number(settings.width);
  if (maker === "turning") return Number.isFinite(width) && width > 0 ? width : { small: 72, medium: 160, large: 300 }[settings.scale] ?? 300;
  return 360;
}

/**
 * The code for one cube in one format, or null where that way of making a cube has no such format. `options` is
 * `CUBE_OPTIONS`; `settings` maps an option's id to the value chosen.
 */
export function codeFor(maker, format, options, settings) {
  const spec = MAKERS[maker];
  if (!spec.formats.includes(format)) return null;
  const call = entriesFor(options, settings, maker);
  const attrs = spec.element === undefined ? [] : attributesFor(options, settings, maker);
  const themed = usesThemes(call);
  const imports = (names) => `import { ${names.join(", ")} } from "${PACKAGE}";`;
  const optionOf = (name) => options.find((one) => one.names[spec.element] === name);
  const define = `import "${PACKAGE}/element/define";`;

  if (maker === "view") {
    const lines = objectLines(call);
    const names = ["CubeView", ...(themed ? ["CUBE_THEMES"] : [])];
    if (format === "module") return `${imports(names)}\n\n// #cube is an element with a size and position: relative; the cube fills it.\nnew CubeView(document.getElementById("cube"), ${literal(lines)});`;
    if (format === "react") {
      const props = call.filter((entry) => !entry.name.startsWith("colours.")).map((entry) => (entry.name === "theme" ? `theme={CUBE_THEMES.${entry.value}}` : typeof entry.value === "string" ? `${entry.name}=${quote(entry.value)}` : `${entry.name}={${entry.value}}`));
      const colours = call.filter((entry) => entry.name.startsWith("colours."));
      if (colours.length > 0) props.push(`colours={{ ${colours.map((entry) => `${entry.name.slice(8)}: ${quote(entry.value)}`).join(", ")} }}`);
      const line = `<Kyuubu ${props.join(" ")} style={{ maxWidth: 300 }} />`;
      return `${themed ? `${imports(["CUBE_THEMES"])}\n` : ""}import { Kyuubu } from "${PACKAGE}/react";\n\nexport function Cube() {\n  return ${line.length > 70 ? `(\n    <Kyuubu\n${[...props, "style={{ maxWidth: 300 }}"].map((one) => `      ${one}`).join("\n")}\n    />\n  )` : line};\n}`;
    }
    const box = `style="width: 300px; height: 300px; position: relative"`;
    const made = `new CubeView(box.value, ${literal(lines, "  ")})`;
    if (format === "vue") return `<script setup>\nimport { onBeforeUnmount, onMounted, ref } from "vue";\n${imports(names)}\n\nconst box = ref(null);\nlet cube;\nonMounted(() => {\n  cube = ${made};\n});\nonBeforeUnmount(() => cube?.destroy());\n</script>\n\n<template>\n  <div ref="box" ${box}></div>\n</template>`;
    if (format === "svelte") return `<script>\n  import { onMount } from "svelte";\n  ${imports(names)}\n\n  let box;\n  onMount(() => {\n    const cube = new CubeView(box, ${literal(lines, "    ")});\n    return () => cube.destroy();\n  });\n</script>\n\n<div bind:this={box} ${box}></div>`;
    if (format === "angular")
      return `import { Component, ElementRef, OnDestroy, afterNextRender, viewChild } from "@angular/core";\n${imports(names)}\n\n@Component({\n  selector: "app-cube",\n  template: \`<div #box ${box}></div>\`,\n})\nexport class CubeComponent implements OnDestroy {\n  private box = viewChild.required<ElementRef<HTMLElement>>("box");\n  private cube?: CubeView;\n  constructor() {\n    afterNextRender(() => {\n      this.cube = new CubeView(this.box().nativeElement, ${literal(lines, "      ")});\n    });\n  }\n  ngOnDestroy() {\n    this.cube?.destroy();\n  }\n}`;
  }

  const tag = tagOf(spec, attrs);
  if (format === "element") return `<script type="module" src="${CDN}"></script>\n${tag}`;
  if (format === "iframe") {
    const side = frameSide(maker, settings);
    const src = `${SITE}${embedAddress(options, settings, maker)}`.replaceAll("&", "&amp;");
    return `<iframe src="${src}" title="Kyuubu" width="${side}" height="${maker === "turning" ? side : 600}" style="border:0;max-width:100%" loading="lazy"></iframe>`;
  }
  if (format === "react") {
    const props = attrs.map((one) => jsx(one, optionOf(one[0])));
    const line = `<${spec.tag} ${props.join(" ")} />`;
    const body = line.length > 64 ? `(\n    <${spec.tag}\n${props.map((one) => `      ${one}`).join("\n")}\n    />\n  )` : line;
    return `// React 19 sets a custom element's properties, which write its attributes.\n${define}\n\nexport function Cube() {\n  return ${body};\n}`;
  }
  if (format === "vue") return `<script setup>\n${define}\n// In vite.config: vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("kyuubu-") } } })\n</script>\n\n<template>\n  ${tagOf(spec, attrs, "  ")}\n</template>`;
  if (format === "svelte") return `<script>\n  ${define}\n</script>\n\n${tagOf(spec, attrs)}`;
  if (format === "angular")
    return `import { CUSTOM_ELEMENTS_SCHEMA, Component } from "@angular/core";\n${define}\n\n@Component({\n  selector: "app-cube",\n  schemas: [CUSTOM_ELEMENTS_SCHEMA],\n  template: \`${tagOf(spec, attrs, "    ")}\`,\n})\nexport class CubeComponent {}`;
  // The module: the element made and put on the page, or the player mounted.
  if (maker === "player") {
    const lines = objectLines(call);
    const names = themed ? [`import { CUBE_THEMES } from "${PACKAGE}";\n`] : [];
    return `${names.join("")}import { mountPlayer } from "${PACKAGE}/player";\n\nmountPlayer(document.getElementById("solve"), ${literal(lines)});`;
  }
  return `${define}\n\nconst cube = document.createElement("kyuubu-scramble");\n${attrs.map(([name, value]) => `cube.setAttribute(${quote(name)}, ${quote(value)});`).join("\n")}\ndocument.body.append(cube);`;
}

/** Every code the cube can be written as, by format: what the page shows under its tabs. */
export function allCode(maker, options, settings) {
  return Object.fromEntries(MAKERS[maker].formats.map((format) => [format, codeFor(maker, format, options, settings)]));
}

/** What the live cube is made from: the options of a call for a view or a player, the attributes of the element for a turning cube. */
export function liveFor(maker, options, settings) {
  const call = entriesFor(options, settings, maker);
  const attrs = MAKERS[maker].element === undefined ? [] : attributesFor(options, settings, maker);
  return { call, attrs };
}

/** The choices as a short address: the way of making and every choice that is not what it would be left out, by id. */
export function toAddress(maker, options, settings) {
  const pairs = [["make", maker]];
  for (const option of options) {
    const value = settings[option.id];
    if (standing(option, value) && !(option.id === "scramble" || option.id === "solution")) continue;
    if (value === undefined || value === "") continue;
    pairs.push([option.id, typeof value === "boolean" ? (value ? "1" : "0") : String(value)]);
  }
  return pairs.map(([name, value]) => `${name}=${encodeURIComponent(value).replaceAll("%20", "+")}`).join("&");
}

/** The choices an address says: the way of making, and a value for each id it names that is a choice. */
export function fromAddress(text, options) {
  const query = new URLSearchParams(text.replace(/^[#?]/, ""));
  const maker = MAKERS[query.get("make")] === undefined ? "view" : query.get("make");
  const settings = {};
  for (const option of options) {
    if (!query.has(option.id)) continue;
    const raw = query.get(option.id);
    if (option.kind === "boolean") settings[option.id] = raw === "1" || raw === "true";
    else if (option.kind === "number") {
      const number = Number(raw);
      if (Number.isFinite(number)) settings[option.id] = number;
    } else if (option.kind === "choice") {
      if (option.choices.includes(raw)) settings[option.id] = raw;
    } else settings[option.id] = raw;
  }
  return { maker, settings };
}
