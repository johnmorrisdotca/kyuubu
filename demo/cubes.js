// The turning cubes page: a cube that keeps turning at a pace you choose, three ways big, and every size small for a list.
/* global familyLanguage */
import { CUBE_THEMES, CubeView } from "./dist/index.js";
import "./dist/element-define.js";

const $ = (id) => document.getElementById(id);

const WORDS = {
  en: {
    pitch: "A cube that keeps turning by itself, at a pace you choose, drawn small, medium or large. For a background, a widget or a list.",
    name: "Kyuubu is how Japanese says “cube”.",
    nameLink: "About the name",
    toCube: "The cube",
    toApi: "API reference",
    toFamous: "Famous solves",
    widgetTitle: "A cube that keeps turning",
    widgetText: "It turns a random layer, waits, and turns another. It stops on a hidden tab, and stays still where your device asks for less motion. Pick how often it turns, or stop it.",
    paceLabel: "How often it turns",
    paceFast: "Every ½ second",
    paceNormal: "Every second",
    paceSlow: "Every 4 seconds",
    widgetStop: "Stop turning",
    widgetStart: "Keep turning",
    scaleLarge: "Large",
    scaleMedium: "Medium, 4×4",
    scaleSmall: "Small, 2×2",
    pickerTitle: "Small, for a list",
    pickerText: "Every size at the small scale, for a picker or a list.",
    pickerCube: "{n}×{n}",
    picked: "You picked {n}×{n}.",
    embedTitle: "On your page",
    embedText: "One tag, or an iframe for a page that allows no scripts. The one below is the iframe.",
    foot: "Nothing here is stored. Rubik's Cube is a trademark of its owner; Kyuubu is not affiliated with it.",
  },
  ja: {
    pitch: "ひとりでに回り続けるキューブです。回る間隔を選べて、小・中・大の大きさで表示できます。背景やウィジェット、リストに使えます。",
    name: "「キューブ」は、英語の cube を日本語で書いたものです。",
    nameLink: "名前について（英語）",
    toCube: "キューブ",
    toApi: "API（英語）",
    toFamous: "有名なソルブ",
    widgetTitle: "回り続けるキューブ",
    widgetText: "ランダムに層を回して、少し待って、また別の層を回します。タブが隠れているあいだは止まり、端末が動きを減らす設定のときは動きません。回る間隔を選ぶか、止めてください。",
    paceLabel: "回る間隔",
    paceFast: "0.5秒ごと",
    paceNormal: "1秒ごと",
    paceSlow: "4秒ごと",
    widgetStop: "回すのをやめる",
    widgetStart: "回し続ける",
    scaleLarge: "大",
    scaleMedium: "中（4×4）",
    scaleSmall: "小（2×2）",
    pickerTitle: "リスト用の小さなキューブ",
    pickerText: "すべてのサイズを小さく表示します。リストや選択欄で使えます。",
    pickerCube: "{n}×{n}",
    picked: "{n}×{n}を選びました。",
    embedTitle: "自分のページに置く",
    embedText: "タグ1つで置けます。スクリプトが使えないページには iframe を使います。下のものは iframe です。",
    foot: "ここでは何も保存しません。Rubik's Cube は権利者の商標です。Kyuubu は権利者とは関係ありません。",
  },
};

let widgetOn = true;
let picked = null;
const drawWidget = () => {
  $("widget-toggle").textContent = page.word(widgetOn ? "widgetStop" : "widgetStart");
  $("widget-toggle").setAttribute("aria-pressed", String(widgetOn));
  $("picked").textContent = picked === null ? "" : page.word("picked").replaceAll("{n}", String(picked));
};
const page = familyLanguage({ id: "kyuubu", words: WORDS, onChange: drawWidget });

const widget = [$("widget-large"), $("widget-medium"), $("widget-small")];
const paceButtons = [...document.querySelectorAll("#paces button")];
for (const button of paceButtons) {
  button.addEventListener("click", () => {
    for (const other of paceButtons) other.setAttribute("aria-pressed", String(other === button));
    for (const cube of widget) cube.setAttribute("pace", button.dataset.pace);
  });
}
$("widget-toggle").addEventListener("click", () => {
  widgetOn = !widgetOn;
  for (const cube of widget) {
    if (widgetOn) cube.play();
    else cube.pause();
  }
  drawWidget();
});

for (let n = 2; n <= 7; n++) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cube-pick";
  button.dataset.n = String(n);
  const box = document.createElement("span");
  const label = document.createElement("small");
  label.textContent = page.word("pickerCube").replaceAll("{n}", String(n));
  button.append(box, label);
  $("picker").append(button);
  new CubeView(box, { size: n, scale: "small", theme: CUBE_THEMES.paper, keyboard: "none" });
  button.addEventListener("click", () => {
    picked = n;
    drawWidget();
  });
}
drawWidget();
document.documentElement.dataset.ready = "true";
