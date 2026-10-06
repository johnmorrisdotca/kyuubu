// The builder: every choice the package offers, a live cube that follows them, and the code that makes exactly that cube.
// The controls are drawn from the package's own list of choices (`CUBE_OPTIONS`), so a choice added to the package
// is on this page without a line written here; the code comes from builder-code.js; the choices live in the address.
/* global familyLanguage */
import { CUBE_OPTIONS, CUBE_OPTION_GROUPS, CUBE_THEMES, CubeView, DEFAULT_COLOURS, DEFAULT_PLASTIC } from "./dist/index.js";
import { mountPlayer } from "./dist/player.js";
import "./dist/element-define.js";
import { FORMATS, MAKERS, attributesFor, codeFor, entriesFor, fromAddress, toAddress } from "./builder-code.js";

const $ = (id) => document.getElementById(id);

const WORDS = {
  en: {
    pitch: "Build a cube with every choice the package offers. Watch it change as you choose, and copy the code that makes exactly that cube.",
    name: "Kyuubu is how Japanese says “cube”.",
    nameLink: "About the name",
    toCube: "The cube",
    toFamous: "Famous solves",
    toCubes: "Turning cubes",
    toApi: "API reference",
    toBuilder: "Builder",
    foot: "Nothing here is stored. The choices are in the address, so a link shares the cube. Rubik's Cube is a trademark of its owner; Kyuubu is not affiliated with it.",
    previewTitle: "Your cube",
    makerLabel: "What to build",
    makerView: "A cube to turn",
    makerPlayer: "A solve to watch",
    makerTurning: "A cube that keeps turning",
    makerViewSays: "A cube a person turns by hand: drag a layer, use the keys or notation. Made with CubeView, or <Kyuubu /> in React.",
    makerPlayerSays: "A solve played back at the pace it was made, with each move shown and listed, a slider, and a way to turn it yourself. Made with mountPlayer, or the <kyuubu-cube> tag.",
    makerTurningSays: "A cube that keeps turning by itself, for a background, a widget or a list. Made with the <kyuubu-scramble> tag.",
    notSet: "Not set",
    on: "On",
    off: "Off",
    reset: "Reset",
    startAgain: "Start again",
    copy: "Copy",
    copied: "Copied.",
    copyLink: "Copy a link to this cube",
    linkCopied: "The link is copied: it opens this cube.",
    codeTitle: "The code",
    codeText: "This is the code for the cube above, and nothing else. Choose how your page will have it, and copy it.",
    onlyDifferent: "Only the choices that are not what the package does when they are left out are written.",
    noteMoves: "The moves could not be read: {what}",
    defaultIs: "Default: {value}",
  },
  ja: {
    pitch: "パッケージのすべての選択肢でキューブを作ります。選ぶと見た目がすぐに変わり、そのキューブを作るコードをコピーできます。",
    name: "「キューブ」は、英語の cube を日本語で書いたものです。",
    nameLink: "名前について（英語）",
    toCube: "キューブ",
    toFamous: "有名なソルブ",
    toCubes: "回り続けるキューブ",
    toApi: "API（英語）",
    toBuilder: "ビルダー",
    foot: "ここでは何も保存しません。選択はアドレスに入るので、リンクでキューブを共有できます。Rubik's Cube は権利者の商標です。Kyuubu は権利者とは関係ありません。",
    previewTitle: "あなたのキューブ",
    makerLabel: "作るもの",
    makerView: "手で回すキューブ",
    makerPlayer: "見るソルブ",
    makerTurning: "回り続けるキューブ",
    makerViewSays: "手で回すキューブです。層をドラッグしたり、キーや回転記号で回します。CubeView、または React の <Kyuubu /> で作ります。",
    makerPlayerSays: "ソルブを実際の速さで再生します。各手の表示と一覧、スライダー、自分で回す機能があります。mountPlayer、または <kyuubu-cube> タグで作ります。",
    makerTurningSays: "ひとりでに回り続けるキューブです。背景やウィジェット、リストに使えます。<kyuubu-scramble> タグで作ります。",
    notSet: "指定なし",
    on: "オン",
    off: "オフ",
    reset: "元に戻す",
    startAgain: "最初からやり直す",
    copy: "コピー",
    copied: "コピーしました。",
    copyLink: "このキューブへのリンクをコピー",
    linkCopied: "リンクをコピーしました。開くとこのキューブになります。",
    codeTitle: "コード",
    codeText: "上のキューブを作るコードです。ほかのものは入っていません。ページでの使い方を選んで、コピーしてください。",
    onlyDifferent: "何も指定しないときの動作と違う選択だけが書かれます。",
    noteMoves: "手順を読めませんでした: {what}",
    defaultIs: "初期値: {value}",
  },
};

/** What a way of making a cube starts with, beyond the package's own defaults: a cube with no size on a page has none to draw. */
const START = { view: {}, player: {}, turning: { scale: "medium" } };

const asked = fromAddress(location.hash, CUBE_OPTIONS);
let maker = asked.maker;
let settings = { ...(asked.settings.scale === undefined && maker === "turning" ? START.turning : {}), ...asked.settings };
let format = new URLSearchParams(location.hash.replace(/^#/, "")).get("show") ?? "";
let preview = null;
let previewKey = "";
let typing = 0;

const page = familyLanguage({ id: "kyuubu", words: WORDS, onChange: () => draw() });
const say = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), page.word(key));

const spec = () => MAKERS[maker];
/** Whether a choice is there for the way of making a cube chosen. */
const applies = (option) => option.names[spec().names] !== undefined || (spec().element !== undefined && option.names[spec().element] !== undefined);
const valueOf = (option) => settings[option.id] ?? option.default;
const unit = (option) => (option.id === "time" ? "s" : option.id.endsWith("ms") ? "ms" : "");

/** The cube's options as the live cube takes them: the theme by its object, the faces' colours together. */
function liveOptions() {
  const out = {};
  const colours = {};
  for (const entry of entriesFor(CUBE_OPTIONS, settings, maker)) {
    if (entry.name.startsWith("colours.")) colours[entry.name.slice(8)] = entry.value;
    else out[entry.name] = entry.name === "theme" ? CUBE_THEMES[entry.value] : entry.value;
  }
  if (Object.keys(colours).length > 0) out.colours = colours;
  return out;
}

function drawPreview() {
  const stage = $("bld-stage");
  const options = { ...liveOptions() };
  const attributes = spec().element === undefined ? [] : attributesFor(CUBE_OPTIONS, settings, maker);
  const key = JSON.stringify([maker, options, attributes]);
  if (key === previewKey) return;
  previewKey = key;
  preview?.destroy?.();
  preview = null;
  stage.dataset.maker = maker;
  stage.replaceChildren();
  $("bld-note").textContent = "";
  if (maker === "view") preview = new CubeView(stage, { ...options, size: options.size ?? 3 });
  else if (maker === "player") {
    preview = mountPlayer(stage, options);
    if (preview.fault !== null) {
      const where = preview.fault.fault;
      $("bld-note").textContent = say("noteMoves", { what: where === undefined ? preview.fault.part : `“${where.token}”` });
    }
  } else {
    const cube = document.createElement("kyuubu-scramble");
    for (const [name, value] of attributes) cube.setAttribute(name, value);
    stage.append(cube);
    preview = { destroy: () => cube.remove() };
  }
}

function drawCode() {
  const formats = spec().formats;
  if (!formats.includes(format)) format = formats[0];
  const tabs = $("bld-formats");
  tabs.replaceChildren(
    ...formats.map((name) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.id = `bld-tab-${name}`;
      tab.dataset.format = name;
      tab.setAttribute("aria-controls", "bld-panel");
      tab.setAttribute("aria-selected", String(name === format));
      tab.tabIndex = name === format ? 0 : -1;
      tab.textContent = FORMATS[name].label[page.lang];
      tab.addEventListener("click", () => {
        format = name;
        drawCode();
        keepAddress();
        // The tabs were drawn again, so the focus is put back on the one now chosen.
        $(`bld-tab-${format}`).focus();
      });
      tab.addEventListener("keydown", (event) => {
        const at = formats.indexOf(format);
        const to = event.key === "ArrowRight" ? Math.min(formats.length - 1, at + 1) : event.key === "ArrowLeft" ? Math.max(0, at - 1) : event.key === "Home" ? 0 : event.key === "End" ? formats.length - 1 : null;
        if (to === null) return;
        event.preventDefault();
        format = formats[to];
        drawCode();
        keepAddress();
        $(`bld-tab-${format}`).focus();
      });
      return tab;
    }),
  );
  $("bld-panel").setAttribute("aria-labelledby", `bld-tab-${format}`);
  $("bld-code").textContent = codeFor(maker, format, CUBE_OPTIONS, settings) ?? "";
  $("bld-code").dataset.format = format;
  $("bld-code").dataset.language = FORMATS[format].language;
}

function keepAddress() {
  history.replaceState(null, "", `#${toAddress(maker, CUBE_OPTIONS, settings)}&show=${format}`);
}

/** Something was chosen: the cube, the code and the address follow. Text being typed waits a moment for the next key. */
function changed(slowly = false) {
  const now = () => {
    drawPreview();
    drawCode();
    keepAddress();
  };
  clearTimeout(typing);
  if (slowly) typing = setTimeout(now, 200);
  else now();
}

/* ----- the controls, one for each choice the package offers ----- */

function setValue(option, value, slowly = false) {
  if (value === undefined || value === "") delete settings[option.id];
  else settings[option.id] = value;
  changed(slowly);
}

const labelFor = (option, control) => {
  const label = document.createElement("label");
  label.textContent = option.say[page.lang].label;
  label.htmlFor = control.id;
  return label;
};
const helpFor = (option) => {
  const line = document.createElement("p");
  line.className = "fam-fine";
  line.textContent = option.say[page.lang].help;
  if (option.default !== undefined && option.kind !== "moves") {
    const shown = option.kind === "boolean" ? say(option.default ? "on" : "off") : `${option.default}${unit(option)}`;
    line.textContent += ` ${say("defaultIs", { value: shown })}`;
  }
  return line;
};

function segmented(option, values, labelOf) {
  const group = document.createElement("div");
  group.className = "fam-seg";
  group.id = `opt-${option.id}`;
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", option.say[page.lang].label);
  const shown = () => String(settings[option.id] ?? "");
  const made = [];
  for (const value of values) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.value = value;
    button.textContent = labelOf(value);
    const pressed = () => (value === "" ? settings[option.id] === undefined && option.default === undefined : shown() === value || (settings[option.id] === undefined && String(option.default) === value));
    button.setAttribute("aria-pressed", String(pressed()));
    button.addEventListener("click", () => {
      setValue(option, value === "" ? undefined : option.kind === "number" ? Number(value) : value);
      for (const other of made) other.setAttribute("aria-pressed", String(other.dataset.value === value));
    });
    made.push(button);
    group.append(button);
  }
  return group;
}

function control(option) {
  const box = document.createElement("div");
  box.className = "cube-bld-option";
  box.dataset.testid = `opt-${option.id}`;
  box.dataset.option = option.id;
  const name = option.say[page.lang].label;
  let main;
  if (option.kind === "boolean") {
    main = document.createElement("button");
    main.type = "button";
    main.className = "fam-button";
    main.id = `opt-${option.id}`;
    const draw = () => {
      main.setAttribute("aria-pressed", String(Boolean(valueOf(option))));
      main.textContent = `${name}: ${say(valueOf(option) ? "on" : "off")}`;
    };
    draw();
    main.addEventListener("click", () => {
      setValue(option, !valueOf(option));
      draw();
    });
    box.append(main, helpFor(option));
    return box;
  }
  if (option.kind === "choice") {
    const values = [...(option.default === undefined ? [""] : []), ...option.choices];
    main = segmented(option, values, (value) => (value === "" ? say("notSet") : value));
    const heading = document.createElement("span");
    heading.className = "fam-label";
    heading.id = `opt-${option.id}-label`;
    heading.textContent = name;
    main.setAttribute("aria-labelledby", heading.id);
    main.removeAttribute("aria-label");
    box.append(heading, main, helpFor(option));
    return box;
  }
  if (option.kind === "number") {
    const { min, max, step } = option.range;
    if ((max - min) / step <= 6) {
      main = segmented(option, Array.from({ length: Math.round((max - min) / step) + 1 }, (_, at) => String(min + at * step)), (value) => value);
      const heading = document.createElement("span");
      heading.className = "fam-label";
      heading.id = `opt-${option.id}-label`;
      heading.textContent = name;
      main.setAttribute("aria-labelledby", heading.id);
      main.removeAttribute("aria-label");
      box.append(heading, main, helpFor(option));
      return box;
    }
    const row = document.createElement("div");
    row.className = "cube-bld-number";
    const number = document.createElement("input");
    number.type = "number";
    number.className = "fam-field";
    number.id = `opt-${option.id}`;
    Object.assign(number, { min, max, step });
    number.value = settings[option.id] === undefined ? "" : String(settings[option.id]);
    number.placeholder = option.default === undefined ? say("notSet") : String(option.default);
    const range = document.createElement("input");
    range.type = "range";
    Object.assign(range, { min, max, step });
    range.value = String(valueOf(option) ?? min);
    range.setAttribute("aria-label", name);
    range.addEventListener("input", () => {
      number.value = range.value;
      setValue(option, Number(range.value));
    });
    number.addEventListener("input", () => {
      const parsed = Number(number.value);
      if (number.value === "") setValue(option, undefined, true);
      else if (Number.isFinite(parsed)) {
        range.value = number.value;
        setValue(option, Math.max(min, Math.min(max, parsed)), true);
      }
    });
    row.append(number, range);
    box.append(labelFor(option, number), row, helpFor(option));
    return box;
  }
  if (option.kind === "colour") {
    const row = document.createElement("div");
    row.className = "cube-bld-colour";
    const input = document.createElement("input");
    input.type = "color";
    input.id = `opt-${option.id}`;
    const fallback = () => (option.id === "plastic" ? option.default ?? DEFAULT_PLASTIC : DEFAULT_COLOURS[option.names.view.slice(8)]);
    input.value = settings[option.id] ?? fallback();
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "fam-button";
    clear.textContent = say("reset");
    clear.hidden = settings[option.id] === undefined;
    input.addEventListener("input", () => {
      setValue(option, input.value);
      clear.hidden = false;
    });
    clear.addEventListener("click", () => {
      setValue(option, undefined);
      input.value = fallback();
      clear.hidden = true;
    });
    row.append(input, clear);
    box.append(labelFor(option, input), row, helpFor(option));
    return box;
  }
  const field = document.createElement(option.kind === "moves" ? "textarea" : "input");
  field.className = "fam-field";
  field.id = `opt-${option.id}`;
  if (option.kind === "moves") {
    field.rows = 2;
    field.dataset.mono = "true";
    field.spellcheck = false;
    field.autocapitalize = "off";
  }
  field.value = settings[option.id] ?? (option.kind === "moves" ? option.default : "");
  field.addEventListener("input", () => setValue(option, field.value, true));
  box.append(labelFor(option, field), field, helpFor(option));
  return box;
}

function drawControls() {
  const groups = $("bld-groups");
  const order = Object.keys(CUBE_OPTION_GROUPS);
  const made = [];
  for (const group of order) {
    const options = CUBE_OPTIONS.filter((option) => option.group === group && applies(option));
    if (options.length === 0) continue;
    const details = document.createElement("details");
    details.className = "fam-panel cube-bld-group";
    details.open = true;
    details.dataset.group = group;
    const summary = document.createElement("summary");
    summary.textContent = CUBE_OPTION_GROUPS[group][page.lang];
    const body = document.createElement("div");
    body.className = "cube-bld-options";
    const faces = options.filter((option) => option.kind === "colour");
    for (const option of options.filter((one) => one.kind !== "colour")) body.append(control(option));
    if (faces.length > 0) {
      const grid = document.createElement("div");
      grid.className = "cube-bld-colours";
      for (const option of faces) grid.append(control(option));
      body.append(grid);
    }
    details.append(summary, body);
    made.push(details);
  }
  groups.replaceChildren(...made);
}

function draw() {
  for (const button of $("bld-makers").children) button.setAttribute("aria-pressed", String(button.dataset.maker === maker));
  $("bld-maker-says").textContent = say(maker === "view" ? "makerViewSays" : maker === "player" ? "makerPlayerSays" : "makerTurningSays");
  drawControls();
  previewKey = "";
  changed();
}

for (const button of $("bld-makers").children) {
  button.addEventListener("click", () => {
    maker = button.dataset.maker;
    if (maker === "turning" && settings.scale === undefined && settings.width === undefined) settings.scale = START.turning.scale;
    draw();
  });
}
$("bld-reset").addEventListener("click", () => {
  settings = { ...START[maker] };
  draw();
});

const copy = async (text, into, word) => {
  try {
    await navigator.clipboard.writeText(text);
    into.textContent = say(word);
  } catch {
    into.textContent = "";
  }
};
$("bld-copy").addEventListener("click", () => copy($("bld-code").textContent, $("bld-code-copied"), "copied"));
$("bld-link").addEventListener("click", () => copy(location.href, $("bld-copied"), "linkCopied"));

draw();
document.documentElement.dataset.ready = "true";
