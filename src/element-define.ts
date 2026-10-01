// Importing this file registers <kyuubu-cube> and <kyuubu-scramble>: the one module of the package with an effect of its own, for a page that wants a single script tag.
import { defineCube } from "./element.ts";
import { defineScramble } from "./scramble-element.ts";

defineCube();
defineScramble();

/** The same `defineCube` as `./element`, for a page that wants the element under another name as well. */
export { defineCube, defineScramble };
