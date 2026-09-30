// Runs the built command line as a person would: as a child process, on
// whatever system this is. `pnpm test:cli` builds first. The rules of the
// command line are tested as plain data in test/cli.test.ts; this is the part
// only a real process can show: the exit code, the two streams, standard
// input, the environment.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin", "kyuubu.mjs");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
// An environment with no language of its own, so each case says what it means.
const bare = { ...process.env, LC_ALL: "", LC_MESSAGES: "", LANG: "en_US.UTF-8", NO_COLOR: "" };

let failed = 0;
function check(what, args, want, { input, env } = {}) {
  const ran = spawnSync(process.execPath, [bin, ...args], { input, encoding: "utf8", env: { ...bare, ...env } });
  const got = { code: ran.status, out: ran.stdout, err: ran.stderr };
  const problems = [];
  if (want.code !== undefined && got.code !== want.code) problems.push(`exit code ${got.code}, wanted ${want.code}`);
  for (const stream of ["out", "err"]) {
    const wanted = want[stream];
    if (wanted === undefined) continue;
    const ok = wanted instanceof RegExp ? wanted.test(got[stream]) : typeof wanted === "function" ? wanted(got[stream]) : got[stream] === wanted;
    if (!ok) problems.push(`${stream} was ${JSON.stringify(got[stream])}, wanted ${wanted instanceof RegExp ? wanted : JSON.stringify(wanted)}`);
  }
  if (problems.length > 0) failed += 1;
  console.log(`${problems.length === 0 ? "ok  " : "FAIL"} ${what}${problems.map((p) => `\n       ${p}`).join("")}`);
  return got;
}

const SOLVED = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

check("the version", ["--version"], { code: 0, out: `${version}\n`, err: "" });
check("help", ["--help"], { code: 0, out: /^Usage: kyuubu/, err: "" });
check("a seeded scramble", ["--seed", "table"], { code: 0, out: "D' R2 U' F2 L' S L F' R E' B' R2 D S' R' E' B2 L' B' D2 F' E S U' M'\n", err: "" });
check("a seed of two words is one seed", ["--seed", "club night", "--length", "4"], { code: 0, out: "B L' S' U'\n", err: "" });
check("three scrambles for the 2×2, from one seed", ["-n", "2", "-c", "3", "--seed", "table"], { code: 0, out: /^D' R2 U' F2 L' B' L F' R D' B'\n(.+\n){2}$/, err: "" });
check("nothing asked for is a scramble of 25", [], { code: 0, out: (out) => out.trim().split(" ").length === 25, err: "" });
check("turns applied, and the cube drawn", ["--apply", "R U R' U'"], { code: 0, out: /^ {6}U U L\n[\s\S]*state: UULUUFUUFRRUBRRURRFFDFFUFFFDDRDDDDDDBLLLLLLLLBRRBBBBBB\nNot solved\n$/, err: "" });
check("turns that solve a scramble: exit code 0", ["--verify", "--from", "R U", "U' R'"], { code: 0, out: "Solved. Moves: 2\n", err: "" });
check("turns that do not: exit code 1", ["--verify", "--from", "R U", "U'"], { code: 1, out: "Not solved. Moves: 1\n", err: "" });
check("a solve, step by step", ["-n", "2", "--solve", "R U2 F'"], { code: 0, out: "Hold it      x'\nWhite layer  F'\nWhite layer  F U F'\nWhite layer  F R2 F'\nSteps: 4. Moves: 7\n", err: "" });
check("a turn the cube cannot make goes to standard error, with exit code 1", ["--apply", "R Q"], { code: 1, out: "", err: "kyuubu: “Q” is not a turn a 3×3 cube can make\n" });
check("a wrong option is exit code 2", ["--bogus"], { code: 2, out: "", err: /unknown option --bogus/ });
check("--verify with nothing to start from is exit code 2", ["--verify", "R"], { code: 2, out: "", err: /--verify needs the cube it starts from/ });
check("standard input", ["--apply", "--stdin"], { code: 0, out: new RegExp(`state: ${SOLVED}\\nSolved\\n$`), err: "" }, { input: "R U\nU' R'\n" });
check("standard input with Windows line endings", ["--verify", "--from", "R U", "--stdin"], { code: 0, out: "Solved. Moves: 2\n" }, { input: "U'\r\nR'\r\n" });
check("empty standard input", ["--apply", "--stdin"], { code: 0, out: /Solved\n$/ }, { input: "" });
const json = check("JSON", ["--seed", "table", "--json"], { code: 0, out: /^\{\n {2}"format": 1,/, err: "" });
try {
  const data = JSON.parse(json.out);
  if (data.scrambles.length !== 1 || data.scrambles[0].size !== 3 || data.scrambles[0].seed !== "table" || data.scrambles[0].state.length !== 54) throw new Error("not the scramble asked for");
  console.log("ok   the JSON parses, and is the scramble asked for");
} catch (error) {
  failed += 1;
  console.log(`FAIL the JSON parses: ${error.message}`);
}
check("Japanese by flag", ["-n", "2", "--solve", "R U2 F'", "--lang", "ja"], { code: 0, out: /^持ち方 {2}x'\n白の面 {2}F'\n/, err: "" });
check("Japanese by LANG", ["--help"], { code: 0, out: /^使い方: kyuubu/ }, { env: { LANG: "ja_JP.UTF-8" } });
check("Japanese by LC_ALL over LANG", ["--apply", "Q"], { code: 1, err: "kyuubu: 「Q」は3×3のキューブでは回せません\n" }, { env: { LC_ALL: "ja_JP.UTF-8", LANG: "en_US.UTF-8" } });
check("English by flag over LANG", ["--help", "--lang", "en"], { code: 0, out: /^Usage: kyuubu/ }, { env: { LANG: "ja_JP.UTF-8" } });
const plain = (text) => !text.includes(String.fromCharCode(27));
check("no colour when piped", ["--apply", "R"], { code: 0, out: plain });
check("NO_COLOR is honoured", ["--apply", "R"], { code: 0, out: plain }, { env: { NO_COLOR: "1" } });

if (failed > 0) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("the command line does what it says, on", process.platform, process.version);
