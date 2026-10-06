// The API reference, made from the source: every export of every entry point in package.json,
// with its signature and its doc comment, read with the TypeScript compiler the package is
// built with. `apiOf()` is the data; `apiPage()` is the page the demo site serves as api.html.
// A dev-only tool: the package itself depends on nothing.
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** The source file an entry in `exports` is built from: ./dist/hearts.js is src/hearts.ts. */
const sourceOf = (entry) => resolve(root, entry.default.replace("./dist/", "src/").replace(/\.js$/, ".ts"));

const clip = (text, most = 420) => {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > most ? `${one.slice(0, most - 1)}…` : one;
};

/** Every entry point with its exports: [{ entry, name, exports: [{ name, kind, signature, doc }] }]. */
export function apiOf() {
  const entries = Object.entries(pkg.exports).filter(([key, entry]) => !key.includes("*") && typeof entry === "object" && String(entry.default).startsWith("./dist/")).map(([key, entry]) => ({ key, name: key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`, file: ["ts", "tsx"].map((ext) => sourceOf(entry).replace(/\.ts$/, `.${ext}`)).find((file) => ts.sys.fileExists(file)) }));
  const config = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
  const program = ts.createProgram(entries.map((entry) => entry.file), { ...config.options, noEmit: true });
  const checker = program.getTypeChecker();
  return entries.map(({ key, name, file }) => {
    const module = checker.getSymbolAtLocation(program.getSourceFile(file));
    const exports = checker.getExportsOfModule(module).map((symbol) => {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const declaration = target.declarations?.[0];
      const doc = ts.displayPartsToString(target.getDocumentationComment(checker)).trim();
      let kind = "const";
      let signature;
      if (target.flags & ts.SymbolFlags.Function) {
        kind = "function";
        const type = checker.getTypeOfSymbolAtLocation(target, declaration);
        signature = type.getCallSignatures().map((call) => `${symbol.name}${checker.signatureToString(call, declaration, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature).replace(/ => /, ": ")}`).join("\n");
        signature = signature.replace(/^(\w+)(<[^(]*>)?\((.*)\): /s, (whole, fn, generics, args) => `${fn}${generics ?? ""}(${args}): `);
      } else if (target.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)) {
        kind = "type";
        signature = clip(declaration.getText().replace(/^export /, ""));
      } else if (target.flags & ts.SymbolFlags.Module) {
        kind = "namespace";
        signature = `import { ${symbol.name} } from "${pkg.name}"; // or everything in it from "${pkg.name}/${symbol.name}"`;
        return { name: symbol.name, kind, signature, doc: `Everything the ${pkg.name}/${symbol.name} entry point exports, as one namespace.` };
      } else {
        const type = checker.getTypeOfSymbolAtLocation(target, declaration);
        const calls = type.getCallSignatures();
        if (calls.length > 0) {
          kind = "function";
          signature = clip(`${symbol.name}: ${checker.typeToString(type, declaration, ts.TypeFormatFlags.NoTruncation)}`);
        } else signature = clip(`${symbol.name}: ${checker.typeToString(type, declaration, ts.TypeFormatFlags.NoTruncation)}`);
      }
      return { name: symbol.name, kind, signature: kind === "function" ? clip(signature, 600) : signature, doc };
    });
    exports.sort((a, b) => a.name.localeCompare(b.name, "en"));
    return { entry: key, name, exports };
  });
}

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** A doc comment as HTML: paragraphs, and `code` in backticks. Nothing else is read as markup. */
const prose = (doc) =>
  doc
    .replace(/```\w*\n([\s\S]*?)```/g, (whole, code) => `\u0000${Buffer.from(code).toString("base64")}\u0000`)
    .split(/\n\s*\n/)
    .map((paragraph) => (paragraph.startsWith("\u0000") ? `<pre>${escape(Buffer.from(paragraph.replaceAll("\u0000", ""), "base64").toString()).trimEnd()}</pre>` : `<p>${escape(paragraph.replace(/\n/g, " ")).replace(/`([^`]+)`/g, "<code>$1</code>")}</p>`))
    .join("\n");
const anchor = (entry, name) => `${entry === "." ? "main" : entry.slice(2)}-${name}`;

/** The reference as one page, between the family's header and footer. `frame` wraps the body in the page. */
export function apiBody(api = apiOf()) {
  const total = api.reduce((sum, entry) => sum + entry.exports.length, 0);
  const contents = api.map((entry) => `<li><a href="#${anchor(entry.entry, "")}"><code>${escape(entry.name)}</code></a> <span class="fam-muted">${entry.exports.length}</span></li>`).join("\n");
  const sections = api
    .map(
      (entry) => `<section class="api-entry" id="${anchor(entry.entry, "")}">
        <h2><code>${escape(entry.name)}</code></h2>
        <p class="api-names">${entry.exports.map((one) => `<a href="#${anchor(entry.entry, one.name)}">${escape(one.name)}</a>`).join(" ")}</p>
        ${entry.exports
          .map(
            (one) => `<article id="${anchor(entry.entry, one.name)}" data-kind="${one.kind}">
          <h3><span class="fam-badge">${one.kind}</span> ${escape(one.name)}</h3>
          <pre>${escape(one.signature)}</pre>
          ${one.doc === "" ? "" : prose(one.doc)}
        </article>`,
          )
          .join("\n")}
      </section>`,
    )
    .join("\n");
  return { total, html: `<section class="api-contents"><p class="fam-fine">${pkg.name} ${pkg.version} · ${api.length} entry points · ${total} exports</p><ul>${contents}</ul></section>\n${sections}` };
}

/** The reference page's own words, in both languages, under the names the family's header and footer ask for. */
export const API_WORDS = {
  en: { pitch: "Every export of every entry point, with its signature and its doc comment. Made from the source when the site is built, so it cannot fall behind the code.", name: "", nameLink: "About the name", foot: "Made from the package's own source.", pageBack: "Demo" },
  ja: { pitch: "すべてのエントリーポイントのすべてのエクスポートを、シグネチャとドキュメントコメント付きで一覧にしています。サイトをビルドするときにソースから作るので、コードとずれることはありません。", name: "", nameLink: "名前について（英語）", foot: "パッケージ自身のソースから作っています。", pageBack: "デモ" },
};

/** The words the demo's own header link to this page needs, for the page that links to it: `pageApi`. */
export const API_LINK_WORDS = { en: { pageApi: "API reference" }, ja: { pageApi: "API（英語）" } };

/** The stylesheet of the reference, written beside the family's own as api.css. It uses the family's variables. */
export const API_CSS = `/* The API reference page: made by scripts/api.mjs. */
.api-contents ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); gap: 0 12px; font-size: .9rem; }
.api-contents li a { display: inline-flex; align-items: center; min-height: 44px; overflow-wrap: anywhere; }
.api-contents p { margin: 0 0 4px; }
.api-entry { margin-top: 28px; min-width: 0; }
.api-entry h2 { font-size: 1.15rem; margin: 0 0 6px; overflow-wrap: anywhere; }
.api-names { display: flex; flex-wrap: wrap; gap: 2px 12px; margin: 0 0 12px; font-size: .85rem; }
.api-names a { font-family: var(--mono); display: inline-flex; align-items: center; min-height: 32px; }
.api-entry article { border-top: 1px solid var(--rule); padding: 12px 0; display: grid; gap: 8px; min-width: 0; }
.api-entry article > * { min-width: 0; max-width: 100%; }
.api-entry h3 { margin: 0; font-size: 1rem; font-family: var(--mono); overflow-wrap: anywhere; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.api-entry h3 .fam-badge { font-family: var(--font); font-weight: 600; }
.api-entry p { margin: 0; line-height: 1.5; max-width: 72ch; overflow-wrap: anywhere; }
.api-entry p.api-names { max-width: none; }
.api-entry pre { white-space: pre-wrap; overflow-wrap: anywhere; }
`;

/** The whole page, api.html: the family's header and footer around the reference. `name` is the package's name as written, `icon` its data: URI. */
export function apiPage({ id, name, icon, api = apiBody() }) {
  return `<!doctype html>
<html lang="en">
  <head>
    ${familyHead({ id, title: `${name} API reference: every export, with its signature`, description: `The API reference of the ${name} package: every export of every entry point, with its signature and its documentation, made from the source.` })}
    <link rel="icon" href="${icon}" />
    <link rel="stylesheet" href="family.css" />
    <link rel="stylesheet" href="api.css" />
  </head>
  <body>
    <main>
      ${familyHeader({ id, links: [{ href: "./", say: "pageBack" }] })}
      ${api.html}
      ${familyUnreviewed({ id })}
      ${familyFooter({ id })}
    </main>
    <script>${FAMILY_SCRIPT}</script>
    <script>familyLanguage({ id: ${JSON.stringify(id)}, words: ${JSON.stringify(API_WORDS)} });</script>
  </body>
</html>
`;
}
