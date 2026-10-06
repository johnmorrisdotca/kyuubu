// Importing this file registers <kyuubu-cuboid>: the one module of the cuboid entries with an effect of its own, for a page that wants a single script tag.
import { defineCuboid } from "./element.ts";

defineCuboid();

/** The same `defineCuboid` as `./cuboid/element`, for a page that wants the element under another name as well. */
export { defineCuboid };
