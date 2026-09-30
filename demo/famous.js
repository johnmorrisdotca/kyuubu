// The famous solves page: a record solve played at the pace it was made, any solve pasted in, and the code to show either on another site.
/* global familyLanguage */
import { FAMOUS_SOLVES } from "./dist/famous.js";
import { fill, readSolveLink } from "./dist/index.js";
import { mountPlayer } from "./dist/player.js";

const $ = (id) => document.getElementById(id);

const WORDS = {
  en: {
    pitch: "Record-setting solves of the 3×3, move for move, at the speed they were made. Watch one, slow it down, step through it, or paste any solve and play it. Then put it on your own page.",
    name: "Kyuubu is how Japanese says “cube”.",
    nameLink: "About the name",
    toCube: "The cube",
    tabList: "Famous solves",
    tabPaste: "Paste a solve",
    tabEmbed: "Embed",
    listIntro: "World records with a published scramble and reconstruction. Each one is played by a test, and is here only because the cube ends solved.",
    listMore: "The list has gaps: a record with no published reconstruction is left out.",
    listAdd: "Add a solve",
    listHistory: "Every record there has been, and the current ones in every event:",
    listWiki: "the history of the 3×3 record on the Speedsolving wiki",
    listWca: "the World Cube Association's records",
    yours: "Your solve",
    pasteIntro: "A scramble and the moves that solve it, as cubers write them: wide turns (Rw or r), M E S, x y z, comments after //. Or paste a link to alg.cubing.net in either box. It is played even if it does not end solved, and says so.",
    pasteScramble: "Scramble",
    pasteMoves: "Moves",
    pasteTime: "Time, in seconds",
    pasteSize: "Cube",
    pastePlay: "Play it",
    pasteHelp: "Leave the time empty for a steady pace. The solve is put in this page's address, so the address can be shared.",
    embedIntro: "The solve now showing, for another page. All three carry the scramble and the moves; nothing is stored anywhere.",
    embedFrame: "An iframe, for a page that allows no scripts",
    embedTag: "One tag, for a page that does",
    embedLink: "A link to this page",
    copy: "Copy",
    copied: "Copied.",
    notCopied: "Select the text and copy it.",
    fSolver: "Solver",
    fTime: "Time",
    fWhere: "Competition",
    fWhen: "When",
    fRecord: "It was",
    fBy: "Reconstructed by",
    fSource: "Source",
    fScramble: "Scramble",
    fMoves: "Moves",
    seconds: "{time} seconds",
    dates: "{from} to {to}",
    "world record": "The world record",
    "tied world record": "A tie for the world record",
    sourceRead: "read {day}",
    watch: "{solver}, {time}",
    foot: "Times, names and dates are the World Cube Association's public results; this project is not affiliated with it. Rubik's Cube is a trademark of its owner.",
  },
  ja: {
    pitch: "3×3の記録を作ったソルブを、一手ずつ、実際の速さで。再生して、ゆっくりにして、一手ずつ進めて。自分のソルブを貼り付けて再生することも、自分のページに埋め込むこともできます。",
    name: "「キューブ」は、英語の cube を日本語で書いたものです。",
    nameLink: "名前について（英語）",
    toCube: "キューブ",
    tabList: "有名なソルブ",
    tabPaste: "ソルブを貼り付け",
    tabEmbed: "埋め込み",
    listIntro: "スクランブルと手順が公開されている世界記録です。どれもテストで再生し、キューブがそろうことを確かめたものだけを載せています。",
    listMore: "手順が公開されていない記録は載せていないため、抜けがあります。",
    listAdd: "ソルブを追加する",
    listHistory: "歴代の記録と、全種目の現在の記録はこちら:",
    listWiki: "Speedsolving wiki の3×3記録の歴史（英語）",
    listWca: "世界キューブ協会（WCA）の記録",
    yours: "あなたのソルブ",
    pasteIntro: "スクランブルと、それをそろえる手順を回転記号で。ワイド（Rw や r）、M E S、x y z、// のあとのコメントも読めます。alg.cubing.net のリンクをどちらかの欄に貼り付けても読み込めます。そろわない手順もそのまま再生し、そろわないことを表示します。",
    pasteScramble: "スクランブル",
    pasteMoves: "手順",
    pasteTime: "タイム（秒）",
    pasteSize: "キューブ",
    pastePlay: "再生する",
    pasteHelp: "タイムを空にすると一定の速さで再生します。ソルブはこのページのアドレスに入るので、アドレスを共有できます。",
    embedIntro: "いま表示しているソルブを、ほかのページに。三つともスクランブルと手順をそのまま含み、どこにも保存しません。",
    embedFrame: "iframe（スクリプトを使えないページ用）",
    embedTag: "タグひとつ（スクリプトを使えるページ用）",
    embedLink: "このページへのリンク",
    copy: "コピー",
    copied: "コピーしました。",
    notCopied: "テキストを選択してコピーしてください。",
    fSolver: "選手",
    fTime: "タイム",
    fWhere: "大会",
    fWhen: "日付",
    fRecord: "当時",
    fBy: "手順の再現",
    fSource: "出典",
    fScramble: "スクランブル",
    fMoves: "手順",
    seconds: "{time}秒",
    dates: "{from}〜{to}",
    "world record": "世界記録",
    "tied world record": "世界記録タイ",
    sourceRead: "{day}に確認",
    watch: "{solver}、{time}",
    foot: "タイム、氏名、日付は世界キューブ協会（WCA）の公開記録です。このプロジェクトはWCAとは関係ありません。Rubik's Cube は権利者の商標です。",
  },
};

let player = null;
/** What is showing: a famous solve by its id, or a pasted one. */
let showing = null;

const page = familyLanguage({ id: "kyuubu", words: WORDS, onChange: () => draw() });
const say = (key, values) => fill(page.word(key), values);
const secs = (ms) => (ms / 1000).toFixed(2);

const paramsOf = (solve) => {
  const q = new URLSearchParams();
  if (solve.size !== 3) q.set("size", String(solve.size));
  q.set("scramble", solve.scramble);
  q.set("moves", solve.solution.replace(/\n/g, " "));
  if (solve.timeMs !== undefined) q.set("time", secs(solve.timeMs));
  return q;
};
const attr = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function draw() {
  const solve = showing;
  const famous = solve.id !== undefined;
  $("watch-title").textContent = famous ? say("watch", { solver: solve.solver, time: say("seconds", { time: secs(solve.timeMs) }) }) : say("yours");
  player?.destroy();
  player = mountPlayer($("player"), { size: solve.size, scramble: solve.scramble, solution: solve.solution, timeMs: solve.timeMs, locale: page.lang });

  for (const item of $("list").children) item.firstChild.setAttribute("aria-pressed", String(item.dataset.id === solve.id));

  const facts = $("facts");
  facts.replaceChildren();
  const fact = (key, value, href) => {
    if (value === undefined || value === "") return;
    const dt = document.createElement("dt");
    dt.textContent = say(key);
    const dd = document.createElement("dd");
    if (href === undefined) dd.textContent = value;
    else {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = value;
      dd.append(a);
    }
    facts.append(dt, dd);
  };
  if (famous) {
    fact("fSolver", `${solve.solver} · ${solve.country}`);
    fact("fTime", say("seconds", { time: secs(solve.timeMs) }));
    fact("fWhere", solve.competition, `https://www.worldcubeassociation.org/competitions/${solve.competitionId}`);
    fact("fWhen", solve.from === solve.to ? solve.from : say("dates", { from: solve.from, to: solve.to }));
    fact("fRecord", say(solve.record));
    fact("fBy", solve.reconstructedBy);
    fact("fSource", `${new URL(solve.source).hostname} · ${say("sourceRead", { day: solve.checked })}`, solve.source);
  }
  const code = (key, text) => {
    const dt = document.createElement("dt");
    dt.textContent = say(key);
    const dd = document.createElement("dd");
    dd.className = "fam-notation cube-lines";
    dd.textContent = text;
    facts.append(dt, dd);
  };
  code("fScramble", solve.scramble);
  code("fMoves", solve.solution);

  const q = paramsOf(solve);
  const base = new URL(".", location.href).href;
  const frame = `${base}embed.html#${q}`;
  $("e-frame").value = `<iframe src="${attr(frame)}" title="Kyuubu" width="360" height="600" style="border:0;max-width:100%" loading="lazy"></iframe>`;
  $("e-tag").value = `<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/element-define.js"></${"script"}>\n<kyuubu-cube${solve.size !== 3 ? ` size="${solve.size}"` : ""} scramble="${attr(solve.scramble)}" moves="${attr(solve.solution.replace(/\n/g, " "))}"${solve.timeMs !== undefined ? ` time="${secs(solve.timeMs)}"` : ""} controls></kyuubu-cube>`;
  const link = `${base}famous.html#${famous ? `solve=${solve.id}` : q}`;
  $("e-link").value = link;
  history.replaceState(null, "", `#${famous ? `solve=${solve.id}` : q}`);
}

const list = $("list");
for (const solve of FAMOUS_SOLVES) {
  const item = document.createElement("li");
  item.dataset.id = solve.id;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cube-solve";
  button.dataset.testid = "solve";
  const time = document.createElement("b");
  time.textContent = secs(solve.timeMs);
  const who = document.createElement("span");
  who.textContent = solve.solver;
  const when = document.createElement("small");
  when.textContent = `${solve.competition}`;
  button.append(time, who, when);
  button.addEventListener("click", () => {
    showing = solve;
    draw();
    player.play();
  });
  item.append(button);
  list.append(item);
}

for (let n = 2; n <= 7; n += 1) {
  const option = document.createElement("option");
  option.value = String(n);
  option.textContent = `${n}×${n}`;
  option.selected = n === 3;
  $("p-size").append(option);
}
$("paste").addEventListener("submit", (event) => {
  event.preventDefault();
  // A link to alg.cubing.net pasted in either box is the whole solve: fill both boxes from it.
  const link = readSolveLink($("p-scramble").value) ?? readSolveLink($("p-moves").value);
  if (link !== null) {
    $("p-scramble").value = link.scramble;
    $("p-moves").value = link.solution;
  }
  const time = Number($("p-time").value.replace(",", "."));
  showing = { size: Number($("p-size").value), scramble: $("p-scramble").value, solution: $("p-moves").value, timeMs: time > 0 ? time * 1000 : undefined };
  draw();
  player.play();
});

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const box = $(button.dataset.copy);
    box.select();
    try {
      await navigator.clipboard.writeText(box.value);
      $("copied").textContent = say("copied");
    } catch {
      $("copied").textContent = say("notCopied");
    }
  });
}

const tabs = [...$("tabs").children];
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const other of tabs) {
      other.setAttribute("aria-selected", String(other === tab));
      $(other.getAttribute("aria-controls")).hidden = other !== tab;
    }
  });
}

// The address says what to show: a famous solve by its id, or a pasted one in full.
const asked = new URLSearchParams(location.hash.slice(1));
const named = FAMOUS_SOLVES.find((solve) => solve.id === asked.get("solve"));
if (named !== undefined) showing = named;
else if (asked.has("moves")) {
  const time = Number(asked.get("time"));
  showing = { size: asked.has("size") ? Number(asked.get("size")) : 3, scramble: asked.get("scramble") ?? "", solution: asked.get("moves") ?? "", timeMs: time > 0 ? time * 1000 : undefined };
  $("p-scramble").value = showing.scramble;
  $("p-moves").value = showing.solution;
  $("p-time").value = asked.get("time") ?? "";
  $("p-size").value = String(showing.size);
} else showing = FAMOUS_SOLVES[0];
draw();
document.documentElement.dataset.ready = "true";
