import { FAMILY_EMBED_BUILDER_WORDS } from "./family-embed-builder.js";
// The package supplies its words and preview; the shared builder draws the controls and code.
import { CUBE_THEMES, CubeView, DEFAULT_COLOURS, DEFAULT_PLASTIC } from "./dist/index.js";
import { mountPlayer } from "./dist/player.js";
import "./dist/element-define.js";
import { builder } from "./builder-code.js";
const WORDS = {
  en: {
    ...FAMILY_EMBED_BUILDER_WORDS.en,
    pitch: "Build a cube with every choice the package offers. Watch it change as you choose, and copy the code that makes exactly that cube.",
    name: "Kyuubu is how Japanese says “cube”.",
    nameLink: "About the name",
    toCube: "The cube",
    toFamous: "Famous solves",
    toCubes: "Turning cubes",
    toCuboids: "Cuboids",
    pageDocs: "Docs",
    toApi: "API reference",
    toBuilder: "Builder",
    foot: "Nothing here is stored. The choices are in the address, so a link shares the cube. Rubik's Cube is a trademark of its owner; Kyuubu is not affiliated with it.",
    makerView: "A cube to turn",
    makerPlayer: "A solve to watch",
    makerTurning: "A cube that keeps turning",
    makerViewSays: "A cube a person turns by hand: drag a layer, use the keys or notation. Made with CubeView, or <Kyuubu /> in React.",
    makerPlayerSays: "A solve played back at the pace it was made, with each move shown and listed, a slider, and a way to turn it yourself. Made with mountPlayer, or the <kyuubu-cube> tag.",
    makerTurningSays: "A cube that keeps turning by itself, for a background, a widget or a list. Made with the <kyuubu-scramble> tag.",
    copyLink: "Copy a link to this cube",
    noteMoves: "The moves could not be read: {what}"
  },
  ja: {
    ...FAMILY_EMBED_BUILDER_WORDS.ja,
    pitch: "パッケージのすべての選択肢でキューブを作ります。選ぶと見た目がすぐに変わり、そのキューブを作るコードをコピーできます。",
    name: "「キューブ」は、英語の cube を日本語で書いたものです。",
    nameLink: "名前について（英語）",
    toCube: "キューブ",
    toFamous: "有名なソルブ",
    toCubes: "回り続けるキューブ",
    toCuboids: "直方体",
    pageDocs: "ドキュメント",
    toApi: "API（英語）",
    toBuilder: "ビルダー",
    foot: "ここでは何も保存しません。選択はアドレスに入るので、リンクでキューブを共有できます。Rubik's Cube は権利者の商標です。Kyuubu は権利者とは関係ありません。",
    makerView: "手で回すキューブ",
    makerPlayer: "見るソルブ",
    makerTurning: "回り続けるキューブ",
    makerViewSays: "手で回すキューブです。層をドラッグしたり、キーや回転記号で回します。CubeView、または React の <Kyuubu /> で作ります。",
    makerPlayerSays: "ソルブを実際の速さで再生します。各手の表示と一覧、スライダー、自分で回す機能があります。mountPlayer、または <kyuubu-cube> タグで作ります。",
    makerTurningSays: "ひとりでに回り続けるキューブです。背景やウィジェット、リストに使えます。<kyuubu-scramble> タグで作ります。",
    copyLink: "このキューブへのリンクをコピー",
    noteMoves: "手順を読めませんでした： {what}"
  },
};

function renderPreview({ stage, maker, call, attrs: attributes, note, say }) {
  const options = {};
  const colours = {};
  for (const entry of call) {
    if (entry.name.startsWith("colours.")) colours[entry.name.slice(8)] = entry.value;
    else options[entry.name] = entry.name === "theme" ? CUBE_THEMES[entry.value] : entry.value;
  }
  if (Object.keys(colours).length) options.colours = colours;
  if (maker === "view") return new CubeView(stage, { ...options, size: options.size ?? 3 });
  if (maker === "player") {
    const preview = mountPlayer(stage, options);
    if (preview.fault !== null) {
      const where = preview.fault.fault;
      note.textContent = say("noteMoves", { what: where === undefined ? preview.fault.part : `“${where.token}”` });
    }
    return preview;
  }
  const cube = document.createElement("kyuubu-scramble");
  for (const [name, value] of attributes) cube.setAttribute(name, value);
  stage.append(cube);
  return { destroy: () => cube.remove() };
}

function docsLanguage(options) {
  const updateDocs = (lang) => document.querySelector('[data-say="pageDocs"]')?.setAttribute("href", lang === "ja" ? "docs/ja/index.html" : "docs/index.html");
  const page = globalThis.familyLanguage({ ...options, onChange: (lang) => { updateDocs(lang); options.onChange?.(lang); } });
  updateDocs(page.lang);
  return page;
}

builder.mount({ language: docsLanguage, words: WORDS, initial: { view: {}, player: {}, turning: { scale: "medium" } },
  classPrefix: "cube-bld", renderPreview,
  colourDefault: (option) => option.id === "plastic" ? option.default ?? DEFAULT_PLASTIC : DEFAULT_COLOURS[option.names.view.slice(8)],
});
