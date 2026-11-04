// The demo page's list of solves and its downloads.

import { draw } from "./app-draw.js";
import { keep } from "./app-play.js";
import { $, record, s } from "./app-state.js";
import { summarize, toCSV, toJSON } from "./dist/index.js";
import { toMarkdown, toSql } from "./downloads.js";

export function bindSolves() {
  const download = (name, type, text) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  const current = () => (s.solves.length > 0 ? s.solves : s.scramble.length + s.moves.length > 0 ? [record()] : []);
  $("json").addEventListener("click", () => download("kyuubu-solves.json", "application/json", toJSON(current())));
  $("csv").addEventListener("click", () => download("kyuubu-solves.csv", "text/csv", toCSV(current())));
  const solveColumns = ["time", "size", "scramble", "moves", "count", "solved", "seconds", "seed"];
  const solveRows = () =>
    current().map((record) => {
      const summary = summarize(record);
      return {
        time: record.at === undefined ? null : new Date(record.at).toISOString(),
        size: record.size,
        scramble: summary.scramble,
        moves: summary.moves,
        count: summary.count,
        solved: summary.solved,
        seconds: record.ms === undefined ? null : Number((record.ms / 1000).toFixed(2)),
        seed: record.seed ?? null,
      };
    });
  $("md").addEventListener("click", () =>
    download("kyuubu-solves.md", "text/markdown", toMarkdown(solveColumns, solveRows())),
  );
  $("sql").addEventListener("click", () =>
    download("kyuubu-solves.sql", "application/sql", toSql("solves", solveColumns, solveRows())),
  );
  $("clear").addEventListener("click", () => {
    s.solves = [];
    keep();
    draw();
  });
}
