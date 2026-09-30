// Plays a scramble and a solve and says whether the cube ends solved: what a solve must pass before
// it joins src/famous.data.ts.   pnpm solve:check "<scramble>" "<moves>" [size]
// Either argument may be a link to alg.cubing.net, which carries both.
import process from "node:process";

import { countSolveMoves, planReplay, readSolveLink, solveText } from "../dist/index.js";

const [first = "", second = "", size = "3"] = process.argv.slice(2);
const link = readSolveLink(first) ?? readSolveLink(second);
const scramble = link?.scramble ?? first;
const solution = link?.solution ?? second;
if (scramble === "" && solution === "") {
  console.error('Give a scramble and the moves: pnpm solve:check "R U R\' U\'" "U R U\' R\'"');
  process.exit(2);
}
const planned = planReplay({ size: Number(size), scramble, solution });
if (!planned.ok) {
  const where = planned.fault.fault;
  console.error(where === undefined ? `Could not read the ${planned.fault.part}.` : `Could not read the ${planned.fault.part}: "${where.token}" at line ${where.line}, place ${where.column} (${where.reason}).`);
  process.exit(1);
}
const { plan } = planned;
console.log(`scramble: ${solveText(plan.scramble)}`);
console.log(`moves:    ${solveText(plan.steps)}`);
console.log(`${countSolveMoves(plan.steps)} moves, ${plan.steps.length} steps with turns of the whole cube`);
console.log(plan.solved ? "It ends solved." : "It does NOT end solved.");
process.exit(plan.solved ? 0 : 1);
