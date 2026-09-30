// The source is read by bundlers and by the site that holds it, whatever they take a plain .js to be;
// what is built is ES modules, and says so where Node looks: the nearest package.json.
import { writeFileSync } from "node:fs";

writeFileSync(new URL("../dist/package.json", import.meta.url), '{ "type": "module" }\n');
