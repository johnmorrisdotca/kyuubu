// The demo page's language: the family's chooser and the page's words.

import { draw } from "./app-draw.js";
import { s } from "./app-state.js";
import { WORDS } from "./app-words.js";
import { fill } from "./dist/index.js";

/* global familyLanguage */
export const page = familyLanguage({
  id: "kyuubu",
  words: WORDS,
  onChange: (lang) => {
    s.view.setLocale(lang);
    s.guide?.setLocale(lang);
    draw();
  },
});
export const say = (key, values) => fill(page.word(key), values);
