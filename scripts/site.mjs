// Builds the static demo for GitHub Pages into ./_site: the page, its two stylesheets, its
// script and the compiled library. The header, the footer and the language chooser come from
// scripts/family-template.mjs, which every package in the family shares unchanged.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const id = "kyuubu";
const parts = {
  head: familyHead({
    id,
    title: "Kyuubu · a turning cube for the browser, with a solve you can follow",
    description: "A turning cube from 2×2 to 7×7, drawn in CSS 3D with no canvas and no framework. Drag a sticker, roll the wheel, use a finger or type cubers' notation. Scrambles, a layer-by-layer solve shown step by step, themes, and solves saved as text, JSON or CSV. Free and open source.",
    ogTitle: "Kyuubu キューブ",
    ogDescription: "A turning cube for the browser, in CSS 3D. 2×2 to 7×7, with a solve you can follow.",
  }),
  header: familyHeader({ id, links: [{ href: "famous.html", say: "toFamous" }] }),
  famousHead: familyHead({
    id,
    title: "Kyuubu · famous solves, played move for move",
    description: "World record solves of the 3×3 cube played at the speed they were made, from their published scrambles and reconstructions. Slow one down, step through it, paste any solve and play it, and embed it on your own page.",
    ogTitle: "Kyuubu キューブ · famous solves",
    ogDescription: "Record solves of the 3×3, move for move, at the speed they were made.",
  }),
  famousHeader: familyHeader({ id, links: [{ href: "./", say: "toCube" }] }),
  unreviewed: familyUnreviewed({ id }),
  footer: familyFooter({ id }),
  script: `<script>${FAMILY_SCRIPT}</script>`,
};

const fillPage = (file) =>
  readFileSync(`demo/${file}`, "utf8").replace(/<!-- family:(\w+) -->/g, (whole, name) => {
    if (!(name in parts)) throw new Error(`demo/${file} asks for family:${name}, which the template does not have`);
    return parts[name];
  });
const page = fillPage("index.html");

rmSync("_site", { recursive: true, force: true });
mkdirSync("_site", { recursive: true });
writeFileSync("_site/index.html", page);
writeFileSync("_site/famous.html", fillPage("famous.html"));
for (const file of ["family.css", "site.css", "app.js", "famous.js", "embed.html"]) cpSync(`demo/${file}`, `_site/${file}`);
cpSync("docs/cube.png", "_site/cube.png");
cpSync("dist", "_site/dist", { recursive: true });
console.log("_site/ is ready: serve it, or let the Pages workflow publish it.");
