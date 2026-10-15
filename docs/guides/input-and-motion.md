---
title: Input and motion
section: how-to
order: 8
description: Choose where keys go, how drags pick a layer, and how a scrambling cube is paced and stopped.
---

## Keep keys in their place

Use `keyboard: "focus"` when several cubes share a page. The focused cube accepts face keys, depth digits and whole-cube keys; Shift reverses turns. Use `keyboard: "none"` when your application supplies its own shortcuts. Input is enabled with `interactive: true`.

## Drags and seams

A drag chooses a layer after enough movement distinguishes its direction. Releasing before the commit angle snaps back; a committed turn or flick completes it. A seam can select adjacent layers. Low-level helpers return null while a direction is ambiguous. Cuboids also respect their half-turn-only slices.

## Control continual turning

`keepScrambling` accepts `autoplay: false` so a host can start it after a user action. Its handle has start, stop, setPace and destroy. The native helper observes page visibility and reduced-motion settings. A seeded source makes choices repeatable, but motion still follows the host's clock.

## Full controls

[Controls](../CONTROLS.md) keeps the key, wheel, touch and seam details. [CubeViewOptions](api:CubeViewOptions) lists turn timing, commit angle, look angles and callbacks. Always destroy a directly mounted view when its host is removed.
