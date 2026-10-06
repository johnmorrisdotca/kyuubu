// Packs the package the way it is published (`npm pack`, npm and not pnpm),
// installs the tarball into an empty project, and uses it as somebody who
// installed it would: every entry in `exports` imported by ESM and loaded by
// `require`, and each command in `bin` run. A package whose `exports` name a
// file that is not in the tarball fails here, before it can be published:
// 1.0.0 and 1.0.1 were published that way. `pnpm test:package` builds first.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const windows = process.platform === "win32";
const scratch = mkdtempSync(join(tmpdir(), "kyuubu-package-"));

/** Run a command and hand back what it printed. On Windows, npm and the installed commands are .cmd files, which only a shell runs; node itself is run directly. */
function run(command, args, cwd, viaShell = false) {
  const shell = viaShell && windows;
  // A path is quoted for the shell; a bare name such as npm is left for the shell to find.
  const ran = spawnSync(shell && /[\\/]/.test(command) ? `"${command}"` : command, args, { cwd, encoding: "utf8", shell });
  if (ran.status !== 0) {
    console.error(`FAIL ${command} ${args.join(" ")}\n${ran.stdout}\n${ran.stderr}`);
    process.exit(1);
  }
  return ran.stdout;
}

// 1. Pack, with npm.
const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch], root, true));
const tarball = join(scratch, packed[0].filename);
const inTarball = new Set(packed[0].files.map((file) => file.path));
console.log(`ok   npm pack: ${packed[0].filename}, ${packed[0].files.length} files`);
// The README's pictures are in docs/images, for GitHub and npm to show by address, and are never in what is installed.
const shipped = [...inTarball].filter((file) => file.startsWith("docs/") || /\.(webp|png|jpe?g|gif)$/.test(file));
if (shipped.length > 0) {
  console.error(`FAIL the tarball holds pictures or docs: ${shipped.join(", ")}`);
  process.exit(1);
}
console.log("ok   no picture and nothing from docs/ is in the tarball");

// 2. Everything package.json points at is in the tarball, and nothing it points at is source.
const pointed = [pkg.main, pkg.module, pkg.types, ...Object.values(pkg.bin ?? {}), ...Object.values(pkg.exports).flatMap((entry) => (typeof entry === "string" ? [entry] : Object.values(entry)))].filter((file) => file !== undefined);
for (const file of new Set(pointed)) {
  if (!inTarball.has(file.replace(/^\.\//, ""))) {
    console.error(`FAIL package.json points at ${file}, which is not in the tarball`);
    process.exit(1);
  }
}
if (pkg.publishConfig?.exports !== undefined) {
  console.error("FAIL publishConfig.exports is only applied by pnpm: `exports` must name the built files itself");
  process.exit(1);
}
console.log(`ok   every file package.json points at is in the tarball (${new Set(pointed).size})`);

// 3. Install it into an empty project, with the one optional peer its React entry needs.
const project = join(scratch, "project");
mkdirSync(project);
writeFileSync(join(project, "package.json"), JSON.stringify({ name: "scratch", private: true, version: "0.0.0" }));
run("npm", ["install", "--no-audit", "--no-fund", "--silent", tarball, "react"], project, true);
console.log("ok   npm install of the tarball");

// 4. Every entry in `exports`, by ESM and by require, and the package doing its job.
const entries = Object.keys(pkg.exports).map((key) => (key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`));
const SCRAMBLE = "B L' S' U' F' R2 B R U2 B' R2 D' F2 R U M2 B R2 S R F2 L' B' E2 B2";
const use = (from) => `
const { VERSION, cubeSolved, movesNotation, parseMoves, randomScramble, seededRandom, solveSteps, solvedCube, turnAll, undoAll } = ${from};
const scramble = randomScramble(3, 25, seededRandom("club night"));
if (movesNotation(scramble, 3) !== ${JSON.stringify(SCRAMBLE)}) throw new Error("the seeded scramble came to " + movesNotation(scramble, 3));
const mixed = turnAll(solvedCube(3), 3, scramble);
if (cubeSolved(mixed, 3) || !cubeSolved(turnAll(mixed, 3, undoAll(scramble)), 3)) throw new Error("the scramble does not undo");
if (!cubeSolved(turnAll(mixed, 3, solveSteps(mixed, 3).flatMap((step) => step.moves)), 3)) throw new Error("the solve does not solve");
if (parseMoves("R Q", 3) !== null) throw new Error("a turn that is not one was read");
if (VERSION !== ${JSON.stringify(pkg.version)}) throw new Error("VERSION is " + VERSION);
`;
writeFileSync(
  join(project, "esm.mjs"),
  `${entries.map((entry, i) => `import * as m${i} from ${JSON.stringify(entry)};`).join("\n")}
const all = [${entries.map((_, i) => `m${i}`).join(", ")}];
const names = ${JSON.stringify(entries)};
all.forEach((m, i) => { if (Object.keys(m).length === 0) throw new Error(names[i] + " exports nothing"); });
${use("m0")}
console.log(names.join(" "));
`,
);
writeFileSync(
  join(project, "cjs.cjs"),
  `const names = ${JSON.stringify(entries)};
for (const name of names) { const m = require(name); if (Object.keys(m).length === 0) throw new Error(name + " exports nothing"); }
${use(`require(${JSON.stringify(pkg.name)})`)}
console.log(names.join(" "));
`,
);
console.log(`ok   import:  ${run(process.execPath, ["esm.mjs"], project).trim()}`);
console.log(`ok   require: ${run(process.execPath, ["cjs.cjs"], project).trim()}`);

// 5. Each command in `bin`, as installed.
for (const name of Object.keys(pkg.bin ?? {})) {
  const command = join(project, "node_modules", ".bin", windows ? `${name}.cmd` : name);
  const version = run(command, ["--version"], project, true).trim();
  if (version !== pkg.version) {
    console.error(`FAIL ${name} --version said ${version}`);
    process.exit(1);
  }
  // One word to an argument: a shell on Windows is handed them unquoted. scripts/check-cli.mjs covers the rest.
  const scrambled = run(command, ["--seed", "table", "--length", "6"], project, true).replace(/\r\n/g, "\n");
  if (scrambled !== "D' R2 U' F2 L' S\n") {
    console.error(`FAIL ${name} scrambled ${JSON.stringify(scrambled)}`);
    process.exit(1);
  }
  console.log(`ok   ${name} --version and a seeded scramble, as installed`);
}

rmSync(scratch, { recursive: true, force: true });
console.log("the package installs and runs as published, on", process.platform, process.version);
