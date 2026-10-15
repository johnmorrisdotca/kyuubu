---
title: Embed and share a cube
section: how-to
order: 5
description: Put a cube or a scrambling cube on a page with the builder, the custom elements or an iframe, and share the settings as a link.
---

## Start with the builder

The native builder offers a hand-turned view, a replay player and a continually turning cube. Its preview uses the package's native engine. Copy the module, framework, custom-element or iframe code for the chosen mode. Choices in the builder address can be shared without storing them.

## Register an element

Importing the definition entry registers `kyuubu-cube` and `kyuubu-scramble`; the engine entry alone does not. Use the explicit define functions for a different tag name.

```ts no-run
import "@johnmorrisdotca/kyuubu/element/define";

const cube = document.createElement("kyuubu-cube");
cube.setAttribute("scramble", "R U");
cube.setAttribute("moves", "U' R'");
cube.setAttribute("autoplay", "off");
cube.addEventListener("kyuubu-end", () => console.log("Finished"));
document.body.append(cube);
```

## Attributes and events

[CUBE_ELEMENT_ATTRIBUTES](api:CUBE_ELEMENT_ATTRIBUTES) lists replay attributes, including size, scramble, moves, timing, controls and theme. A present boolean attribute enables its option; `off`, `false`, `0` and `no` disable it. Properties mirror attributes. `kyuubu-step` bubbles with replay status; `kyuubu-end` bubbles at the end. Removing an element disposes its player.

`kyuubu-scramble` uses its own attribute list for pace, scale, width, seed and input. The cuboid tag has a separate registration entry and `dims`. The [builder reference](../embed-builder.md) describes every native setting and the frame messages; frame progress messages contain metadata rather than private saved records.

## Size the frame

Use the copied dimensions for the selected mode and keep its width within the container. A replay needs room for its controls; a turning widget uses the chosen scale or explicit width.
