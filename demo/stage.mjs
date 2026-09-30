// Lays the demo out for GitHub Pages: the page, and the built package beside it.
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("_site", { recursive: true, force: true });
mkdirSync("_site", { recursive: true });
cpSync("demo/index.html", "_site/index.html");
cpSync("docs/cube.png", "_site/cube.png");
cpSync("dist", "_site/dist", { recursive: true });
console.log("Demo staged in _site/");
