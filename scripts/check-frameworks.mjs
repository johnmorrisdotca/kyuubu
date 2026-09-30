// Proves the claim in the README: the packed package works in React, Vue, Svelte, Angular and a
// plain page, with nothing for the consumer to configure. It packs the package, makes a small
// project for each in a scratch folder, installs the tarball and each framework's own tools
// there (never here: the package has no dependencies), and builds it. Then it opens each built
// page in Chromium and WebKit at a phone's size, turns the cube with a key, and checks that
// the turn came back through the framework and that the cube on the screen made it.
//
//   pnpm build && node scripts/check-frameworks.mjs [scratch folder]
//
// Run it before a release that names a framework. It needs the network and a few minutes.
// KYUUBU_FRAMEWORKS=vue,react builds only those; KYUUBU_BROWSER=none skips the browsers.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import process from "node:process";

const root = resolve(process.argv[2] ?? mkdtempSync(join(tmpdir(), "kyuubu-frameworks-")));
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
const run = (cwd, command, args) => execFileSync(command, args, { cwd, stdio: "pipe", shell: process.platform === "win32", env: { ...process.env, NG_CLI_ANALYTICS: "false" } }).toString();
const write = (dir, files) => {
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), typeof text === "string" ? text : JSON.stringify(text, null, 2));
  }
};

run(process.cwd(), "npm", ["pack", "--ignore-scripts", "--pack-destination", root]);
const tarball = join(root, readdirSync(root).find((name) => name.endsWith(".tgz")));
const kyuubu = `file:${tarball}`;
const page = (script) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>kyuubu</title></head><body><div id="app"></div>${script}</body></html>`;
const BOX = "width: 300px; height: 300px; position: relative";

const projects = {
  // The cube in a component's mount hook, which is all any framework needs.
  vue: {
    out: "dist",
    files: {
      "package.json": { name: "check-vue", private: true, type: "module", dependencies: { "@johnmorrisdotca/kyuubu": kyuubu, vue: "^3.5.0" }, devDependencies: { vite: "^7.0.0", "@vitejs/plugin-vue": "^6.0.0" } },
      "vite.config.js": `import vue from "@vitejs/plugin-vue";\nexport default { base: "./", plugins: [vue()] };\n`,
      "index.html": page(`<script type="module" src="/src/main.js"></script>`),
      "src/main.js": `import { createApp } from "vue";\nimport App from "./App.vue";\ncreateApp(App).mount("#app");\n`,
      "src/App.vue": `<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { CubeView, moveNotation } from "@johnmorrisdotca/kyuubu";

const box = ref(null);
const turned = ref("");
let cube;
onMounted(() => {
  cube = new CubeView(box.value, { size: 3, keyboard: "page", onTurn: (move) => (turned.value = moveNotation(move, 3)) });
});
onBeforeUnmount(() => cube?.destroy());
</script>

<template>
  <div ref="box" style="${BOX}"></div>
  <p id="turned">{{ turned }}</p>
</template>
`,
    },
  },
  svelte: {
    out: "dist",
    files: {
      "package.json": { name: "check-svelte", private: true, type: "module", dependencies: { "@johnmorrisdotca/kyuubu": kyuubu, svelte: "^5.0.0" }, devDependencies: { vite: "^7.0.0", "@sveltejs/vite-plugin-svelte": "^6.0.0" } },
      "vite.config.js": `import { svelte } from "@sveltejs/vite-plugin-svelte";\nexport default { base: "./", plugins: [svelte()] };\n`,
      "index.html": page(`<script type="module" src="/src/main.js"></script>`),
      "src/main.js": `import { mount } from "svelte";\nimport App from "./App.svelte";\nmount(App, { target: document.getElementById("app") });\n`,
      "src/App.svelte": `<script>
  import { onMount } from "svelte";
  import { CubeView, moveNotation } from "@johnmorrisdotca/kyuubu";

  let box;
  let turned = $state("");
  onMount(() => {
    const cube = new CubeView(box, { size: 3, keyboard: "page", onTurn: (move) => (turned = moveNotation(move, 3)) });
    return () => cube.destroy();
  });
</script>

<div bind:this={box} style="${BOX}"></div>
<p id="turned">{turned}</p>
`,
    },
  },
  angular: {
    out: "dist/check-angular/browser",
    files: {
      "package.json": {
        name: "check-angular",
        private: true,
        dependencies: { "@johnmorrisdotca/kyuubu": kyuubu, "@angular/common": "^20.0.0", "@angular/compiler": "^20.0.0", "@angular/core": "^20.0.0", "@angular/platform-browser": "^20.0.0", rxjs: "^7.8.0", tslib: "^2.8.0" },
        devDependencies: { "@angular/build": "^20.0.0", "@angular/cli": "^20.0.0", "@angular/compiler-cli": "^20.0.0", typescript: "~5.8.0" },
      },
      "angular.json": {
        version: 1,
        projects: {
          "check-angular": {
            projectType: "application",
            root: "",
            sourceRoot: "src",
            architect: { build: { builder: "@angular/build:application", options: { outputPath: "dist/check-angular", index: "src/index.html", browser: "src/main.ts", tsConfig: "tsconfig.json", baseHref: "./" }, configurations: { production: {} }, defaultConfiguration: "production" } },
          },
        },
      },
      "tsconfig.json": { compilerOptions: { target: "ES2022", module: "ES2022", moduleResolution: "bundler", strict: true, experimentalDecorators: true, skipLibCheck: true, lib: ["ES2022", "dom"] }, files: ["src/main.ts"] },
      "src/index.html": page(`<check-root></check-root>`),
      "src/main.ts": `import { Component, ElementRef, OnDestroy, afterNextRender, provideZonelessChangeDetection, signal, viewChild } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { CubeView, moveNotation } from "@johnmorrisdotca/kyuubu";

@Component({
  selector: "check-root",
  template: \`<div #box style="${BOX}"></div><p id="turned">{{ turned() }}</p>\`,
})
class App implements OnDestroy {
  private box = viewChild.required<ElementRef<HTMLElement>>("box");
  private cube?: CubeView;
  turned = signal("");
  constructor() {
    afterNextRender(() => {
      this.cube = new CubeView(this.box().nativeElement, { size: 3, keyboard: "page", onTurn: (move) => this.turned.set(moveNotation(move, 3)) });
    });
  }
  ngOnDestroy() {
    this.cube?.destroy();
  }
}

bootstrapApplication(App, { providers: [provideZonelessChangeDetection()] });
`,
    },
  },
  react: {
    out: "dist",
    files: {
      "package.json": { name: "check-react", private: true, type: "module", dependencies: { "@johnmorrisdotca/kyuubu": kyuubu, react: "^19.0.0", "react-dom": "^19.0.0" }, devDependencies: { vite: "^7.0.0", "@vitejs/plugin-react": "^5.0.0" } },
      "vite.config.js": `import react from "@vitejs/plugin-react";\nexport default { base: "./", plugins: [react()] };\n`,
      "index.html": page(`<script type="module" src="/src/main.jsx"></script>`),
      "src/main.jsx": `import { useState } from "react";
import { createRoot } from "react-dom/client";
import { moveNotation } from "@johnmorrisdotca/kyuubu";
import { Kyuubu } from "@johnmorrisdotca/kyuubu/react";

function App() {
  const [turned, setTurned] = useState("");
  return (
    <>
      <Kyuubu size={3} keyboard="page" style={{ maxWidth: 300 }} onTurn={(move) => setTurned(moveNotation(move, 3))} />
      <p id="turned">{turned}</p>
    </>
  );
}
createRoot(document.getElementById("app")).render(<App />);
`,
    },
  },
  // No framework and no bundler: a script tag and the files as they are published.
  plain: {
    out: ".",
    build: (dir) => {
      run(dir, "npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts"]);
      cpSync(join(dir, "node_modules/@johnmorrisdotca/kyuubu"), join(dir, "kyuubu"), { recursive: true, dereference: true });
      rmSync(join(dir, "node_modules"), { recursive: true, force: true });
    },
    files: {
      "package.json": { name: "check-plain", private: true, dependencies: { "@johnmorrisdotca/kyuubu": kyuubu } },
      "index.html": page(`<div id="cube" style="${BOX}"></div>
<p id="turned"></p>
<script type="module">
  import { CubeView, moveNotation } from "./kyuubu/dist/index.js";

  new CubeView(document.getElementById("cube"), {
    size: 3,
    keyboard: "page",
    onTurn: (move) => (document.getElementById("turned").textContent = moveNotation(move, 3)),
  });
</script>`),
    },
  },
};

const only = process.env.KYUUBU_FRAMEWORKS?.split(",");
const built = [];
for (const [name, project] of Object.entries(projects)) {
  if (only !== undefined && !only.includes(name)) continue;
  const dir = join(root, name);
  write(dir, project.files);
  const started = Date.now();
  try {
    if (project.build !== undefined) project.build(dir);
    else {
      run(dir, "npm", ["install", "--no-audit", "--no-fund"]);
      run(dir, "npx", name === "angular" ? ["ng", "build"] : ["vite", "build"]);
    }
    if (!existsSync(join(dir, project.out, "index.html"))) throw new Error(`no index.html in ${project.out}`);
    built.push([name, join(dir, project.out)]);
    console.log(`built   ${name.padEnd(8)} in ${Math.round((Date.now() - started) / 1000)} s`);
  } catch (error) {
    console.log(`FAILED  ${name}: ${String(error.stderr ?? error.stdout ?? error.message).split("\n").slice(-12).join("\n")}`);
    process.exitCode = 1;
  }
}

// Open each built page in a browser and turn the cube: it has to draw, take the key, turn, and hand the turn back.
if (process.env.KYUUBU_BROWSER !== "none") {
  const { chromium, webkit } = createRequire(import.meta.url)(process.env.KYUUBU_BROWSER ?? "@playwright/test");
  const { solvedCube, turnCube, parseMove } = await import("../dist/index.js");
  const wanted = turnCube(solvedCube(3), 3, parseMove("R", 3));
  const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };
  for (const [engine, launcher] of [["chromium", chromium], ["webkit", webkit]]) {
    const browser = await launcher.launch();
    for (const [name, out] of built) {
      const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
      const tab = await context.newPage();
      const errors = [];
      tab.on("pageerror", (error) => errors.push(String(error)));
      await tab.route("http://check.test/**", (route) => {
        let file = join(out, decodeURIComponent(new URL(route.request().url()).pathname));
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
        if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
        return route.fulfill({ body: readFileSync(file), contentType: types[extname(file)] ?? "application/octet-stream" });
      });
      await tab.goto("http://check.test/");
      let turned = "";
      let state = "";
      try {
        await tab.waitForSelector("[data-kyuubu]");
        const stickers = await tab.locator("[data-kyuubu] [data-slot]").count();
        await tab.keyboard.press("r");
        await tab.waitForFunction(() => document.getElementById("turned").textContent !== "", null, { timeout: 5000 });
        await tab.waitForFunction((end) => document.querySelector("[data-kyuubu]").dataset.state === end, wanted, { timeout: 5000 });
        turned = await tab.locator("#turned").textContent();
        state = await tab.locator("[data-kyuubu]").getAttribute("data-state");
        if (stickers !== 54) errors.push(`${stickers} stickers drawn`);
      } catch (error) {
        errors.push(String(error.message).split("\n")[0]);
      }
      const ok = errors.length === 0 && turned === "R" && state === wanted;
      console.log(`${ok ? "turned " : "FAILED "} ${name.padEnd(8)} in ${engine}: the turn handed back is ${JSON.stringify(turned)}, and the cube on the screen ${state === wanted ? "made it" : "did not make it"}${errors.length > 0 ? ` ${errors.join("; ")}` : ""}`);
      if (!ok) process.exitCode = 1;
      await context.close();
    }
    await browser.close();
  }
}
console.log(`scratch projects are in ${root}`);
