# The shared embed builder

`familyEmbedBuilder` lives in `scripts/family-template.mjs`. The template is copied unchanged into every family repository; its version and hash are recorded by each repository's family checks. The builder is a development tool for static demo sites, and adds no runtime dependency to the published package.

A package supplies its own choices, maker descriptions, words and live preview. The shared implementation draws controls and groups, switches code tabs, copies code and links, and keeps choices in the URL hash. It does not know what a cube, flag or map does.

## Configuration

- `id`: the package id used by the shared language helper.
- `packageName`, `major`, `site`: the npm package name, current npm major and GitHub Pages base URL. Read the major from the package version rather than writing it into a snippet.
- `options`: rows with `id`, `group`, `kind`, optional `default`, `choices` or `range`, `names`, and `say.en` / `say.ja` labels and help. Kinds are number, boolean, choice, colour, text and moves. `names` maps a row to each call's option or element's attribute; dotted names can represent an adapter's nested options. Numeric `factor` entries convert units for a particular maker.
- `groups`: group ids mapped to their English and Japanese names, in display order.
- `leftOut`: `kind.option` mapped to the reason an option cannot be represented by a shareable choice.
- `makers`: each maker supplies a `names` key for calls, an `element` key for attributes, its `tag`, optional iframe `embed` path, supported `formats`, and the word key for its `description`. A maker can supply `required` ids for inputs its renderer needs even at their defaults. Frame `width` and `height` may be numbers or functions of the settings. `image(settings)` supplies a static image fallback when one exists.
- `code(context)`: optional package-specific rendering for a view or another call. Return a string for a handled format, or undefined to use the shared custom-element writer. Kyuubu uses this for CubeView and mountPlayer calls.
- `component`, `selector`, `title`: names used in framework examples and an iframe's accessible title.

The returned methods include `entriesFor`, `attributesFor`, `codeFor`, `allCode`, `liveFor`, `embedAddress`, `toAddress`, `fromAddress`, `validateCoverage` and `mount`. The pure methods run in Node without a document. The option-list argument of the code methods lets tests exercise a new row without rebuilding the page.

## Site integration

The function is self-contained. A site's generator can emit a browser module with:

```js
writeFileSync("site/family-embed-builder.js", `export ${familyEmbedBuilder.toString()};\n`);
```

The browser adapter imports that module and supplies the package configuration. Kyuubu's source adapter imports the shared template directly so unit tests use the same function; its site generator rewrites only that import and the built-package path for the browser.

`builder.mount` receives the page words and a `renderPreview` callback. The callback receives the stage, maker, settings, converted call entries, element attributes, a note element and the translated `say` helper. It returns a preview object with a `destroy` method. Replacing settings destroys the previous preview before rendering the next one. The package supplies any theme-object conversion or domain-specific validation.

The page scaffold has `bld-stage`, `bld-note`, `bld-groups`, `bld-makers`, `bld-maker-says`, `bld-formats`, `bld-panel`, `bld-code`, `bld-reset`, `bld-copy`, `bld-code-copied`, `bld-link` and `bld-copied` ids. Maker buttons have `data-maker` values. The shared code draws option controls and code tabs inside those nodes. `classPrefix` allows an existing page to retain its stylesheet; Kyuubu uses `cube-bld`.

The shared language helper is used by default; another page may supply a compatible `language` function. Its `word` method and `lang` property provide translated text, and its change callback redraws the controls and tab labels. The returned mount handle exposes a copy of settings and can destroy the preview and pending typing timer.

## Output formats and links

The available formats are custom element, static image where provided, iframe, ES module, React 19, Vue, Svelte, Angular, plain HTML, and iframe URL only. A maker lists the formats it actually supports. Unsupported formats return null. An image or iframe also returns null if that maker has no corresponding source.

Default choices are omitted. An enabled boolean that is off by default is a presence attribute; a disabled boolean that is on by default is written as false. Iframe URLs use query parameters by default. `parameters: "hash"` retains an existing iframe contract; Kyuubu uses it for its current embed.html and embed-scramble.html pages. New iframe pages should follow the family's embed/ contract.

The generated HTML escapes attribute text. JavaScript string values escape less-than signs, and Angular template strings escape their delimiters. Shared links accept declared ids, finite numbers within their declared ranges, and listed choices; unknown maker names fall back to the configured default. The iframe itself must validate its parameters independently.

## Coverage and verification

A package test supplies the real option and attribute names to `validateCoverage`. Every name must appear in a row or have a nonempty reason in `leftOut`. Kyuubu also retains its existing source-derived checks for all view/player options and element attributes.

Kyuubu's existing browser suite changes every kind of option, uses the preview, switches language, operates tabs with the keyboard, copies links and code, restores choices from an address, and executes the copied code. A second-package unit fixture verifies that the shared builder uses its own tag, npm major and attributes, supports host formats, escapes hostile text, and fails coverage for an unlisted option.
