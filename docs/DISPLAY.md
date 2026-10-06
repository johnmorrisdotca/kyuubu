# The cube drawn small, and a cube that keeps turning

The scale of a cube and the cube that turns by itself. Moved here from [the README](../README.md) to keep it under the length npm shows.

## A cube drawn small, medium or large

`scale` is the same three names Toranpu's cards take (a cube's `size` is its
side, so the setting is `scale` here). Small is for a list or a picker: every
side from 2×2 to 7×7 is drawn in 72 pixels, look-only, and the box is one
steady square, never wider than its container.

```ts
new CubeView(box, { size: 4, scale: "small" });    // 72 pixels wide, and square
new CubeView(box, { size: 3, scale: "large", interactive: false });
new CubeView(box, { size: 3, width: 100 });        // any width
```

The React component takes `scale` and `width` as props, and the elements below
take them as attributes.

## A cube that keeps turning

For a background or a widget, `keepScrambling` turns a random layer, waits,
and turns another, at a pace you choose. It never turns about the axis it just
used, and it never queues a turn behind one that is still moving.

```ts
import { CubeView, keepScrambling } from "@johnmorrisdotca/kyuubu";

const view = new CubeView(box, { size: 3, scale: "medium", interactive: false });
const loop = keepScrambling(view, { pace: "slow" });   // every 4 seconds
loop.setPace(0.5);                                     // every half second
loop.stop();                                           // the cube stays as it is
loop.start();
loop.destroy();                                        // lets go of the page
```

| Option | Default | Meaning |
| --- | --- | --- |
| `pace` | `1` | Seconds between turns, never under `0.2`, or `"fast"` (0.5), `"normal"` (1), `"slow"` (4) |
| `faces` | `false` | Turn only the six outer faces |
| `random` | `Math.random` | A `() => number` in [0, 1); seeded, the same cube turns the same way |
| `autoplay` | `true` | Start by itself |

It costs nothing nobody can see. A hidden tab is left alone and the cube carries
on when the tab comes back (it listens for `visibilitychange`). A device that
asks for reduced motion gets a cube that stays still: `running` is `false` and
no timer is set.

As a tag, with nothing to build:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/element-define.js"></script>
<kyuubu-scramble size="3" pace="slow" scale="small"></kyuubu-scramble>
```

| Attribute | Means |
| --- | --- |
| `size` | The cube's side, 2 to 7: 3 when left out |
| `pace` | Seconds between turns, or `fast`, `normal`, `slow` |
| `paused` | Does not turn until `play()` |
| `scale`, `width` | `small`, `medium` or `large`, or a width in pixels |
| `theme` | `standard`, `paper` or `stickerless` |
| `faces` | Outer faces only |
| `seed` | The same turns every time |
| `interactive` | Lets a person turn it; off for a small one |
| `lang` | `en` or `ja` |

It has `play()`, `pause()`, `running` and `cube` (the `CubeView`). In a bundle,
`defineScramble` from `@johnmorrisdotca/kyuubu/element` registers it. An iframe
for a page that allows no scripts:

```html
<iframe src="https://johnmorrisdotca.github.io/kyuubu/embed-scramble.html#pace=slow&scale=medium" title="A cube that keeps turning" width="160" height="160" style="border:0;max-width:100%"></iframe>
```

The address carries `size`, `pace`, `scale`, `width`, `theme`, `faces`, `seed`
and `paused`. The [turning cubes page](https://johnmorrisdotca.github.io/kyuubu/cubes.html)
shows it at all three scales.
