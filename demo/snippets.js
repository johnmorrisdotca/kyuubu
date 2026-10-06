// The code a page shows for a cube, written from the choices made on the page and never typed beside them.
// One spec in, one piece of code out, and the cube beside the code is made from the same spec, so what is
// read is what is shown, and what is copied is what is read.

const quote = (text) => JSON.stringify(text);
/** An object literal, on one line while it fits, then one entry to a line. */
const literal = (entries, indent = "") => {
  const one = `{ ${entries.join(", ")} }`;
  if (one.length + indent.length <= 80) return one;
  return `{\n${entries.map((entry) => `${indent}  ${entry},`).join("\n")}\n${indent}}`;
};

/** The look of a cube, as the spec has it: a theme by its name, or colours of its own. */
const looks = (spec) =>
  spec.theme
    ? { theme: spec.theme }
    : { colours: spec.colours ?? {}, ...(spec.plastic === undefined ? {} : { plastic: spec.plastic }) };

/**
 * What a cube made by `new CubeView(element, options)` is given, from the spec: the live options, for the cube beside the
 * code. `themes` is the package's `CUBE_THEMES`.
 */
export function viewOptions(spec, themes) {
  const { theme, colours, plastic } = looks(spec);
  return {
    size: spec.size,
    ...(theme === undefined ? { colours, ...(plastic === undefined ? {} : { plastic }) } : { theme: themes[theme] }),
    ...(spec.turnMs === undefined || spec.turnMs === 160 ? {} : { turnMs: spec.turnMs }),
    ...(spec.animateScramble === false ? { animateScramble: false } : {}),
  };
}

/** The ES module code that makes the cube the spec says. */
export function viewCode(spec) {
  const { theme, colours, plastic } = looks(spec);
  const entries = [`size: ${spec.size}`];
  if (theme !== undefined) entries.push(`theme: CUBE_THEMES.${theme}`);
  else {
    entries.push(`colours: ${literal(Object.entries(colours).map(([face, value]) => `${face}: ${quote(value)}`), "  ")}`);
    if (plastic !== undefined) entries.push(`plastic: ${quote(plastic)}`);
  }
  if (spec.turnMs !== undefined && spec.turnMs !== 160) entries.push(`turnMs: ${spec.turnMs}`);
  if (spec.animateScramble === false) entries.push("animateScramble: false");
  const names = theme === undefined ? "CubeView" : "CubeView, CUBE_THEMES";
  return `import { ${names} } from "@johnmorrisdotca/kyuubu";\n\nnew CubeView(document.getElementById("cube"), ${literal(entries)});`;
}

/** The attributes of a `<kyuubu-scramble>` for the spec, in the order they are written. */
export function scrambleAttributes(spec) {
  return [
    ["size", String(spec.size)],
    ["pace", spec.pace],
    ["scale", spec.scale],
    ...(spec.theme ? [["theme", spec.theme]] : []),
  ];
}

/** The side of a cube at each scale, in pixels, as the package draws it. */
export const SCALE_PX = { small: 72, medium: 160, large: 300 };

/** The tag, and the script that defines it, for the spec. */
export function scrambleTag(spec) {
  const attributes = scrambleAttributes(spec).map(([name, value]) => ` ${name}="${value}"`).join("");
  return `<script type="module" src="https://unpkg.com/@johnmorrisdotca/kyuubu/dist/element-define.js"></script>\n<kyuubu-scramble${attributes}></kyuubu-scramble>`;
}

/** The address of the embed page for the spec, relative to the page, and the frame's side in pixels. */
export function scrambleFrame(spec) {
  const hash = scrambleAttributes(spec).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("&");
  return { path: `embed-scramble.html#${hash}`, side: SCALE_PX[spec.scale] };
}

/** The iframe for the spec, on the published demo. */
export function scrambleIframe(spec) {
  const { path, side } = scrambleFrame(spec);
  const src = `https://johnmorrisdotca.github.io/kyuubu/${path}`.replaceAll("&", "&amp;");
  return `<iframe src="${src}" title="A cube that keeps turning" width="${side}" height="${side}" style="border:0;max-width:100%"></iframe>`;
}
