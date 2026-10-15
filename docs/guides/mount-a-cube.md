---
title: Mount a cube
section: how-to
order: 2
description: Draw a cube in a host element and choose its input, colours and React component.
---

## Give the host a size

[CubeView](api:CubeView) fills its host. Give that element a width, height and relative or absolute position. Importing the engine alone does not create a view.

```ts no-run
import { CubeView, CUBE_THEMES } from "@johnmorrisdotca/kyuubu";

const host = document.createElement("div");
host.style.cssText = "width:300px;height:300px;position:relative";
document.body.append(host);
const cube = new CubeView(host, {
  size: 3, interactive: true, keyboard: "focus", theme: CUBE_THEMES.paper,
  onTurn: (move, state) => console.log(move, state),
});
console.log(cube.state);
// Call cube.destroy() before discarding the host.
```

## Choose input and colours

`interactive: true` enables turning. `keyboard: "focus"` confines keys to the focused cube; use `"none"` to leave keys to your application. Themes set a coherent palette; `colours` overrides individual U, R, F, D, L and B faces. Text labels use `locale: "en"` or `"ja"`.

## Use React

The [React entry](entry:react) exports `Kyuubu` and `KyuubuMoves`. The component maintains the native view and removes it on unmount. Its `size` is required. A custom `className` must give the host a size and position; without one the default host is a responsive square. Use a `KyuubuHandle` ref for imperative turns and resetLook.

## Clean up

Remove listeners and animation work by calling `destroy()` on directly mounted views, players, guides and lists. The full display and theme details remain in [Display](../DISPLAY.md).
