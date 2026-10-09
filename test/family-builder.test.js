import ts from "typescript";
import { describe, expect, it } from "vitest";
import { familyEmbedBuilder } from "../scripts/family-template.mjs";

// A second package proves the shared implementation does not depend on cubes.
const options = [
  { id: "code", group: "content", kind: "text", default: "CA", names: { element: "code", call: "code" } },
  { id: "width", group: "content", kind: "number", default: 48, range: { min: 16, max: 600, step: 1 }, names: { element: "width", call: "width" } },
  { id: "label", group: "content", kind: "text", names: { element: "label", call: "label" } },
  { id: "border", group: "content", kind: "boolean", default: false, names: { element: "border", call: "border" } },
];
const builder = familyEmbedBuilder({ packageName: "@example/flags", major: 4, site: "https://example.test/flags/", options,
  makers: { flag: { names: "call", element: "element", tag: "example-flag", embed: "embed/", formats: ["element", "iframe", "url", "module", "react", "vue", "svelte", "angular", "html", "image"], image: (settings) => `https://example.test/${settings.code ?? "CA"}.svg` } },
  leftOut: { "call.onChange": "A callback cannot be represented in a shareable URL." },
});

describe("a package-independent embed builder", () => {
  it("pins the supplied major and writes this package's tag and imports", () => {
    const code = builder.codeFor("flag", "element", options, { code: "JP", border: true });
    expect(code).toContain("@example/flags@4/dist/element-define.js");
    expect(code).toContain('<example-flag code="JP" border>');
    expect(code).not.toMatch(/kyuubu|Cube/);
    expect(builder.codeFor("flag", "module", options, { code: "JP" })).toContain('import "@example/flags/element/define"');
  });
  it("omits defaults and shares a URL with validated choices", () => {
    expect(builder.attributesFor(options, { code: "CA", width: 48, border: false }, "flag")).toEqual([]);
    const url = builder.codeFor("flag", "url", options, { code: "JP", border: true });
    expect(url).toBe("https://example.test/flags/embed/?code=JP&border=1");
    expect(builder.fromAddress("#make=__proto__&width=Infinity&border=0", options)).toEqual({ maker: "flag", settings: { border: false } });
    expect(builder.fromAddress("#width=10000", options).settings.width).toBe(600);
  });
  it("escapes hostile attribute text and template-string delimiters", () => {
    const label = 'a" onload="bad <script> `${attack}';
    const html = builder.codeFor("flag", "html", options, { label });
    expect(html).toContain('&quot; onload=&quot;bad &lt;script&gt;');
    expect(html).not.toContain('<script>');
    const angular = builder.codeFor("flag", "angular", options, { label });
    expect(angular).toContain('\\`\\${attack}');
  });
  it("round-trips text through the generated React JSX rather than writing escape sequences into an attribute", () => {
    const label = '<b> "quoted" \u005c\u005c path';
    const code = builder.codeFor("flag", "react", options, { label });
    const compiled = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText;
    const body = compiled.replace(/^import .*;$/gm, "").replace("export function", "function");
    const render = new Function("_jsx", body + "\nreturn Example();");
    expect(render((_tag, props) => props).label).toBe(label);
  });
  it("offers the host formats, image fallback and plain URL only when the maker supports them", () => {
    for (const format of builder.makers.flag.formats) expect(builder.codeFor("flag", format, options, {})).toEqual(expect.any(String));
    expect(builder.codeFor("flag", "image", options, {})).toContain('src="https://example.test/CA.svg"');
    expect(builder.codeFor("flag", "missing", options, {})).toBeNull();
    expect(builder.codeFor("flag", "react", options, {})).toContain("React 19");
    expect(builder.codeFor("flag", "vue", options, {})).toContain("isCustomElement");
    expect(builder.codeFor("flag", "angular", options, {})).toContain("CUSTOM_ELEMENTS_SCHEMA");
  });
  it("fails when a real option has neither a row nor a reason for being left out", () => {
    expect(builder.validateCoverage({ call: ["code", "width", "label", "border", "onChange"], element: ["code", "width"] })).toBe(true);
    expect(() => builder.validateCoverage({ call: ["missing"] })).toThrow("call.missing");
  });
});
