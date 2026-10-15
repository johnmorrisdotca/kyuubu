---
title: Troubleshooting & FAQ
section: troubleshooting
order: 9
description: Find out why a view is blank, why a read returns null or throws, and what is stored or sent.
---

## The view is blank

Give its host a size and positioning context. Check that the browser imported the view entry and, for a custom element, its definition entry. An engine-only import does not register elements. Use [Mount a cube](mount-a-cube.md) as the smallest setup.

## A parser returns null

`parseMove`/`parseMoves` refuse unrecognized notation or nonexistent layers. `decodeCubeMoves` refuses an invalid code. For a position and reason, use `parseSolve`. Cuboid parsers also refuse quarter turns of a rectangular slice; `readCuboidMoves` tells you which token and why. `parseCuboidDims` refuses unsupported dimensions. `readSolveLink` accepts supported alg.cubing.net links rather than arbitrary URLs.

## Other null and undefined results

`solveSteps` returns null outside 2×2 and 3×3. `moveName` and `cuboidMoveName` return null for unsupported standard forms. Drag picks wait with null while the gesture is too short or ambiguous; release helpers return null when no turn commits. Movement descriptions and hints refuse combinations that are not one movement; rotation arrows can have null face/arrow when no side is sufficiently visible. `cubeWidthPx` returns null when no explicit width or scale gives one, leaving the host in control.

`fromJSON` and `fromText` return null for an unreadable export. JSON reconstructs records and ignores supplied derived state; invalid records may be omitted. `famousSolve` and `cuboidPreset` return undefined for unknown keys; `paceFromAttribute` returns undefined for the default pace. An unplanned player's plan/status is null and its fault explains the problem. An unmounted React ref is null. Element string properties return null for absent attributes.

## A valid replay is unfinished

A planned replay can have `solved: false`. This preserves a reconstruction as supplied; it is different from `ok: false`, which refuses invalid input. Likewise, checking sticker counts does not prove a state is physically reachable.

## A cuboid turn throws

The low-level engine expects a legal move. Check `cuboidMoveLegal` or parse with the cuboid's dimensions first. Invalid turns throw RangeError; they are not silently converted to half turns.

## Does the package store or upload a solve?

The engine and builder do not upload records. The builder stores settings in its address. Host applications choose any history storage themselves. Exported files are made locally.
