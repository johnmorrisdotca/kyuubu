// Package-specific view and player calls; the shared builder owns controls, attributes, tabs and URLs.
import { CUBE_OPTIONS, CUBE_OPTION_GROUPS, CUBE_OPTIONS_LEFT_OUT, VERSION } from "../dist/index.js";
import { familyEmbedBuilder } from "../scripts/family-template.mjs";
export const PACKAGE = "@johnmorrisdotca/kyuubu";
export const SITE = "https://johnmorrisdotca.github.io/kyuubu/";
export const MAKERS = {
  view: { names: "view", required: ["size"], description: "makerViewSays", formats: ["module", "react", "vue", "svelte", "angular"] },
  player: { names: "player", element: "cube", tag: "kyuubu-cube", embed: "embed.html", parameters: "hash", required: ["scramble", "solution"], width: 360, height: 600, description: "makerPlayerSays", formats: ["element", "module", "iframe", "react", "vue", "svelte", "angular", "html", "url"] },
  turning: { names: "turning", element: "turning", tag: "kyuubu-scramble", embed: "embed-scramble.html", parameters: "hash", width: (settings) => Number.isFinite(Number(settings.width)) && Number(settings.width) > 0 ? Number(settings.width) : { small: 72, medium: 160, large: 300 }[settings.scale] ?? 300, description: "makerTurningSays", formats: ["element", "module", "iframe", "react", "vue", "svelte", "angular", "html", "url"] },
};

const quote = (text) => JSON.stringify(String(text)).replaceAll("<", "\\u003c");
const plain = (value) => typeof value === "string" ? quote(value) : String(value);
/** `theme: CUBE_THEMES.paper`, `colours: { U: "#fff" }` and the rest, as the lines of an options object. */
function objectLines(entries, { themes = true } = {}) {
  const colours = entries.filter((entry) => entry.name.startsWith("colours."));
  const others = entries.filter((entry) => !entry.name.startsWith("colours."));
  const lines = others.map((entry) => (entry.name === "theme" && themes ? `theme: CUBE_THEMES.${entry.value}` : `${entry.name}: ${plain(entry.value)}`));
  if (colours.length > 0) lines.push(`colours: { ${colours.map((entry) => `${entry.name.slice(8)}: ${quote(entry.value)}`).join(", ")} }`);
  return lines;
}


export const builder = familyEmbedBuilder({ id: "kyuubu", packageName: PACKAGE, major: VERSION.split(".")[0], site: SITE,
  title: "Kyuubu", component: "Cube", selector: "app-cube", defaultMaker: "view", makers: MAKERS,
  options: CUBE_OPTIONS, groups: CUBE_OPTION_GROUPS, leftOut: CUBE_OPTIONS_LEFT_OUT,
  unit: (option) => option.id === "time" ? "s" : option.id.endsWith("ms") ? "ms" : "",
  code: ({ maker, format, call, literal }) => {
    const themed = call.some((entry) => entry.name === "theme");
    const imports = (names) => `import { ${names.join(", ")} } from "${PACKAGE}";`;
  if (maker === "view") {
    const lines = objectLines(call);
    const names = ["CubeView", ...(themed ? ["CUBE_THEMES"] : [])];
    if (format === "module") return `${imports(names)}\n\n// #cube is an element with a size and position: relative; the cube fills it.\nnew CubeView(document.getElementById("cube"), ${literal(lines)});`;
    if (format === "react") {
      const props = call.filter((entry) => !entry.name.startsWith("colours.")).map((entry) => (entry.name === "theme" ? `theme={CUBE_THEMES.${entry.value}}` : typeof entry.value === "string" ? `${entry.name}={${quote(entry.value)}}` : `${entry.name}={${entry.value}}`));
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
  if (maker === "player" && format === "module") {
    const lines = objectLines(call);
    const names = themed ? [`import { CUBE_THEMES } from "${PACKAGE}";\n`] : [];
    return `${names.join("")}import { mountPlayer } from "${PACKAGE}/player";\n\nmountPlayer(document.getElementById("solve"), ${literal(lines)});`;
  }
    return undefined;
  },
});
export const CDN = builder.cdn;
export const FORMATS = builder.formats;
export const { entriesFor, attributesFor, embedAddress, frameSide, codeFor, allCode, liveFor, toAddress, fromAddress } = builder;
