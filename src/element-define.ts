// Importing this file registers <kyuubu-cube>: the one module of the package with an effect of its own, for a page that wants a single script tag.
import { defineCube } from "./element.ts";

defineCube();

/** The same `defineCube` as `./element`, for a page that wants the element under another name as well. */
export { defineCube };
