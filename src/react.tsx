import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from "react";

import type { CubeFace } from "./cube.ts";
import { CUBE_SCALE_INTERACTIVE } from "./scale.ts";
import type { CubeMove } from "./types.ts";
import { mountMoveList, type MoveListHandle, type MoveListOptions } from "./move-list.ts";
import { CubeView, type CubeTheme, type CubeViewOptions } from "./view/view.ts";

/** What a parent can ask of the cube on the screen. */
export type KyuubuHandle = {
  /** Turn a layer, animated; told to `onTurn` only when `report` is set. */
  turn: (move: CubeMove, options?: { report?: boolean; animate?: boolean }) => void;
  /** Put the stickers as given, at once. */
  setState: (state: string) => void;
  /** Back to the way it was first seen. */
  resetLook: () => void;
  /** Change its colours, its plastic or the shape of its stickers, without redrawing it. */
  setTheme: (theme: CubeTheme) => void;
  /** The stickers once every turn asked for is done. */
  state: () => string;
  /** Scramble the cube with these turns: the last few turn quickly and the rest are made at once, unless `animate` is false or the cube was made with `animateScramble: false`. */
  scramble: (moves: readonly CubeMove[], options?: { animate?: boolean }) => void;
  /** Show on the cube how to make these moves (the layer lit, an arrow the way to drag), or nothing with null. The `hint` prop does the same. */
  showHint: (moves: CubeMove | readonly CubeMove[] | null) => void;
};

/** The component's props: every option of `CubeView`, a `state` the parent may keep, and the box's `className`, `style` and `data-*`. */
export type KyuubuProps = Omit<CubeViewOptions, "state"> & {
  /**
   * The stickers the cube starts with. Read when the cube is made, and again
   * whenever it changes to something the cube is not already showing, so a
   * parent that keeps the state and hands it back never makes it jump.
   */
  state?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<KyuubuHandle>;
  colours?: Partial<Record<CubeFace, string>>;
  /**
   * Moves to show on the cube, the way the visual guide shows them: the layer
   * lit and an arrow the way to drag it. Null or left out shows nothing. Shown
   * again whenever it changes, and on a cube made afresh.
   */
  hint?: CubeMove | readonly CubeMove[] | null;
  /** Anything a test or a page wants on the cube's box. */
  [data: `data-${string}`]: string | undefined;
};

/**
 * THE CUBE AS A REACT COMPONENT: a thin wrapper round `CubeView`, which does
 * the work. It fills the box it is given: with no `className` that box is a
 * square as wide as its container, and a `className` must position it
 * (relative or absolute) and give it a size.
 */
export function Kyuubu({ ref, className, style, size, state, interactive: interactiveGiven, hint = null, onTurn, onLook, ...rest }: KyuubuProps) {
  const { scale, width } = rest;
  const interactive = interactiveGiven ?? (scale === undefined ? true : CUBE_SCALE_INTERACTIVE[scale]);
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<CubeView | null>(null);
  const handlers = useRef({ onTurn, onLook });
  useEffect(() => {
    handlers.current = { onTurn, onLook };
  }, [onTurn, onLook]);
  const { colours, plastic, theme, locale, keyboard, turnMs, animateScramble, commitAngle, yaw, pitch, fill, label, rounded } = rest;
  const hinted = useRef(hint);
  const data = Object.fromEntries(Object.entries(rest).filter(([key]) => key.startsWith("data-")));

  useEffect(() => {
    if (box.current === null) return;
    const made = new CubeView(box.current, {
      size,
      state,
      interactive,
      scale,
      width,
      colours,
      plastic,
      theme,
      locale,
      keyboard,
      turnMs,
      animateScramble,
      commitAngle,
      yaw,
      pitch,
      fill,
      label,
      rounded,
      onTurn: (move, now) => handlers.current.onTurn?.(move, now),
      onLook: (y, p) => handlers.current.onLook?.(y, p),
    });
    view.current = made;
    if (hinted.current !== null) made.showHint(hinted.current);
    return () => {
      made.destroy();
      view.current = null;
    };
    // Made again only for what cannot be changed on a cube already drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, keyboard, plastic, yaw, pitch, fill, label, rounded, animateScramble, JSON.stringify(colours ?? {}), JSON.stringify(theme ?? {})]);

  // The hint is shown again only when it says something else: a parent that makes a new array of the same moves on every render changes nothing.
  const hintKey = JSON.stringify(hint);
  useEffect(() => {
    hinted.current = hint;
    view.current?.showHint(hint);
    // The moves themselves, compared by what they say.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintKey]);

  useEffect(() => {
    if (locale !== undefined) view.current?.setLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (state !== undefined && view.current !== null && view.current.state !== state) view.current.setState(state);
  }, [state]);

  useEffect(() => {
    view.current?.setScale(scale, width);
  }, [scale, width]);

  useEffect(() => {
    view.current?.setInteractive(interactive);
  }, [interactive]);

  useEffect(() => {
    if (turnMs !== undefined) view.current?.setTurnMs(turnMs);
  }, [turnMs]);

  useImperativeHandle(ref, () => ({
    turn: (move, options) => view.current?.turn(move, options),
    setState: (next) => view.current?.setState(next),
    resetLook: () => view.current?.resetLook(),
    setTheme: (next) => view.current?.setTheme(next),
    state: () => view.current?.state ?? state ?? "",
    showHint: (moves) => view.current?.showHint(moves),
    scramble: (moves, options) => view.current?.scramble(moves, options),
  }));

  // With no class of its own the box is a square as wide as its container; a class says where it sits and how big it is, and is left to.
  const boxStyle: CSSProperties = className === undefined ? { position: "relative", width: "100%", aspectRatio: "1 / 1", ...style } : { ...style };
  return <div ref={box} className={className} style={boxStyle} {...data} />;
}

/** The props of `KyuubuMoves`: every option of the list, and the box's `className` and `style`. */
export type KyuubuMovesProps = MoveListOptions & {
  className?: string;
  style?: CSSProperties;
  ref?: Ref<MoveListHandle>;
};

/**
 * THE MOVES AS A REACT COMPONENT: a thin wrapper round `mountMoveList`. Give
 * it the runs of moves and the one just made, and it marks that one and
 * scrolls it into view; `onPick` hears a press or a key. The runs are drawn
 * again only when what they say changes.
 */
export function KyuubuMoves({ ref, className, style, groups, current = null, locale, label, onPick }: KyuubuMovesProps) {
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<MoveListHandle | null>(null);
  const handlers = useRef({ onPick });
  const first = useRef({ groups, current, locale, label });
  useEffect(() => {
    handlers.current = { onPick };
  }, [onPick]);
  useEffect(() => {
    if (box.current === null) return;
    const made = mountMoveList(box.current, { ...first.current, onPick: (index, group, at) => handlers.current.onPick?.(index, group, at) });
    list.current = made;
    return () => {
      made.destroy();
      list.current = null;
    };
  }, [label]);
  const key = JSON.stringify(groups);
  useEffect(() => {
    list.current?.setGroups(groups, current);
    // The runs, compared by what they say.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    list.current?.setCurrent(current);
  }, [current]);
  useEffect(() => {
    if (locale !== undefined) list.current?.setLocale(locale);
  }, [locale]);
  useImperativeHandle(ref, () => ({
    get element() {
      return list.current!.element;
    },
    setCurrent: (index) => list.current?.setCurrent(index),
    setGroups: (next, now) => list.current?.setGroups(next, now),
    setLocale: (next) => list.current?.setLocale(next),
    focus: () => list.current?.focus(),
    destroy: () => list.current?.destroy(),
  }));
  return <div ref={box} className={className} style={style} />;
}
