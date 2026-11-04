import { createHash } from "node:crypto";
import { readdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { pkg, read, readme, STRINGS, VERSION } from "./docs.fixture.js";

describe("the community files", () => {
  it("SECURITY.md and CODE_OF_CONDUCT.md are the family's master text (the shared .github repository's), a copy of which is kept in scripts/community", () => {
    for (const file of ["SECURITY.md", "CODE_OF_CONDUCT.md"])
      expect(read(file), file).toBe(read(`scripts/community/${file}`));
  });

  it("CONTRIBUTING.md carries the family's house rules and the README points to the security policy", () => {
    const contributing = read("CONTRIBUTING.md");
    for (const rule of [
      "Open an issue first",
      "No runtime dependencies",
      "kebab case",
      "CC0 or public domain only",
      "Needs Node 22 or later",
    ])
      expect(contributing, rule).toContain(rule);
    expect(readme).toContain("[security policy](./SECURITY.md)");
  });
});

describe("Node", () => {
  it("is 22 or later in the package, the README, CONTRIBUTING and CI, and never 20", () => {
    expect(pkg.engines.node).toBe(">=22");
    expect(readme).toContain("Node 22 or later");
    expect(readme).not.toMatch(/Node 20/);
    expect(read("CONTRIBUTING.md")).not.toMatch(/Node 20/);
    expect(read(".github/workflows/ci.yml")).toContain("node: [22, 24]");
  });
});

describe("the release notes", () => {
  it("are the changelog's section for the version, which the Release workflow puts on the GitHub release", async () => {
    const { releaseNotes } = await import("../scripts/release-notes.mjs");
    const log =
      "# Changelog\n\n## [Unreleased]\n\n## [1.2.0] - 2026-01-02\n\n### Added\n\n- A thing.\n\n## [1.1.0] - 2026-01-01\n\n- Older.\n\n[Unreleased]: https://example.test\n";
    expect(releaseNotes(log, "1.2.0")).toBe("### Added\n\n- A thing.");
    expect(releaseNotes(log, "1.1.0")).toBe("- Older.");
    expect(releaseNotes(log, "9.9.9")).toBeNull();
    expect(releaseNotes(log, "Unreleased")).toBeNull();
    expect(releaseNotes(read("CHANGELOG.md"), VERSION)?.length).toBeGreaterThan(40);
    const workflow = read(".github/workflows/release.yml");
    expect(workflow).toContain("scripts/release-notes.mjs");
    expect(workflow).not.toContain("See CHANGELOG.md.");
  });
});

describe("the README's accessibility", () => {
  it("says what the source does: a labelled application that takes focus, a live guide, an alert, buttons that report pressed, reduced motion", () => {
    const section = readme.slice(readme.indexOf("## Accessibility"), readme.indexOf("## Browser support"));
    expect(section.length).toBeGreaterThan(500);
    const view = ["src/view/view-scene.ts", "src/view/view-hands.ts"].map(read).join("\n");
    expect(view).toContain('this.root.setAttribute("role", "application")');
    expect(view).toContain("this.root.tabIndex = 0");
    expect(view).toContain('this.options.keyboard === "focus"');
    expect(read("src/guide-panel.ts")).toContain('"aria-live", "polite"');
    expect(read("src/guide-panel.ts")).toContain('"role", "alert"');
    expect(read("src/player.ts")).toContain('"aria-pressed"');
    expect(read("src/player.ts")).toContain('"aria-label", say("playerScrub")');
    expect(view).toContain("prefers-reduced-motion: reduce");
    expect(read("src/scrambler.ts")).toContain("prefers-reduced-motion: reduce");
    expect(readme).toContain("e2e/properties.e2e.mjs");
  });
});

describe("the list of Japanese strings", () => {
  const line = (text) => text.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
  const lines = [
    "# Kyuubu's words, in English and Japanese",
    "",
    "Made from `src/words.ts` and `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.",
    "",
    "**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please",
    "open a *Fix a translation* issue with the string's name. `{n}` and the other braces are filled in when shown.",
    "",
    "| Name | English | Japanese |",
    "| --- | --- | --- |",
    ...Object.keys(STRINGS.en).map((key) => `| \`${key}\` | ${line(STRINGS.en[key])} | ${line(STRINGS.ja[key])} |`),
    "",
  ];
  const made = lines.join("\n");

  it("is what the source makes: run `pnpm docs:make` after changing a string", () => {
    if (process.env.UPDATE_DOCS === "1") writeFileSync("docs/strings-ja.md", made);
    expect(read("docs/strings-ja.md")).toBe(made);
  });
});

describe("the demo site", () => {
  const sha = (text) => createHash("sha256").update(text).digest("hex");
  // The family's one stylesheet and one template, as every package carries them. A package never edits either.
  const FAMILY_CSS = "c1e392564a7fd94d0bb5cfaefb6d4fedfd147fc3e27f3a7afd8d8dac8c94a227";
  const FAMILY_TEMPLATE = "fcc192026cf284303344e108b20e6181126607c670a881a6b3bf8479da26ab03";

  it("wears the family's stylesheet, byte for byte", () => {
    const css = read("demo/family.css");
    const [first, ...rest] = css.split("\n");
    expect(first).toBe(`/* sha256 of every line after this one: ${FAMILY_CSS} */`);
    expect(sha(rest.join("\n"))).toBe(FAMILY_CSS);
  });

  it("and uses the family's header and footer, unchanged", () => {
    expect(sha(read("scripts/family-template.mjs"))).toBe(FAMILY_TEMPLATE);
  });

  it("loads the family's stylesheet before its own, and restyles nothing of the family's", () => {
    const page = read("demo/index.html");
    expect(page.indexOf('href="family.css"')).toBeGreaterThan(0);
    expect(page.indexOf('href="kyuubu.css"')).toBeGreaterThan(page.indexOf('href="family.css"'));
    for (const name of ["head", "header", "unreviewed", "footer", "script"])
      expect(page).toContain(`<!-- family:${name} -->`);
    expect(page).not.toMatch(/<style/);
    // Its own stylesheet styles its own classes, and the two variables the family leaves to a page.
    const own = read("demo/kyuubu.css").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of own.matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
      const selector = rule[2].trim();
      if (selector === ":root") continue;
      expect(selector, selector).toMatch(/\.cube-|\.more pre/);
    }
  });

  it("has a Japanese line for every English one on the page, with the same places to fill in", async () => {
    const app = read("demo/app-words.js");
    const tableText = app.slice(
      app.indexOf("export const WORDS = {"),
      app.indexOf("\n};\n", app.indexOf("export const WORDS = {")) + 3,
    );
    const words = new Function(`${tableText.replace("export ", "")}; return WORDS;`)();
    expect(Object.keys(words.ja)).toEqual(Object.keys(words.en));
    const places = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((found) => found[1]).sort();
    for (const key of Object.keys(words.en)) expect(places(words.ja[key]), key).toEqual(places(words.en[key]));
    // Every word the page asks for is in the table, or is one the family's template brings.
    const page = read("demo/index.html");
    for (const found of page.matchAll(/data-say(?:-label|-placeholder)?="(\w+)"/g))
      expect(Object.keys(words.en), found[1]).toContain(found[1]);
    for (const found of app.matchAll(/say\("(\w+)"/g)) expect(Object.keys(words.en), found[1]).toContain(found[1]);
  });
});

describe("the source", () => {
  it("has a doc comment on every export", () => {
    const files = [...readdirSync("src"), ...readdirSync("src/view").map((name) => `view/${name}`)].filter(
      (name) => /\.tsx?$/.test(name) && name !== "index.ts",
    );
    expect(files.length).toBeGreaterThan(10);
    const bare = [];
    for (const file of files) {
      const lines = read(`src/${file}`).split("\n");
      lines.forEach((text, at) => {
        if (/^export (const|function|type|class) /.test(text) && !lines[at - 1].trim().endsWith("*/"))
          bare.push(`${file}: ${text}`);
      });
    }
    expect(bare).toEqual([]);
  });

  it("holds no control character and no mention of how it was made", () => {
    for (const file of [
      "README.md",
      "CHANGELOG.md",
      "CONTRIBUTING.md",
      "demo/app.js",
      "demo/app-words.js",
      "src/cli.ts",
    ]) {
      const controls = new RegExp(
        `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}]`,
      );
      expect(read(file), file).not.toMatch(controls);
    }
  });
});

describe("the version", () => {
  it("is the same in the package, in the code and in the changelog", () => {
    expect(VERSION).toBe(pkg.version);
    expect(read("CHANGELOG.md")).toContain(`## [${VERSION}]`);
    expect(readme).toContain(`"generator": "kyuubu ${VERSION}"`);
  });

  it("the package names built files, a command and what it is", () => {
    for (const entry of Object.values(pkg.exports))
      for (const file of Object.values(entry)) expect(file).toMatch(/^\.\/dist\//);
    expect(pkg.publishConfig.exports).toBeUndefined();
    expect(pkg.bin).toEqual({ kyuubu: "bin/kyuubu.mjs" });
    expect(pkg.files).toContain("bin");
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.description.length).toBeLessThanOrEqual(250);
    expect(new Set(pkg.keywords).size).toBe(pkg.keywords.length);
  });
});
