import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from "react";

import type { CubeFace } from "./cube.ts";
import type { CubeMove } from "./types.ts";
import { CubeView, type CubeViewOptions } from "./view/view.ts";

/** What a parent can ask of the cube on the screen. */
export type KyuubuHandle = {
  /** Turn a layer, animated; told to `onTurn` only when `report` is set. */
  turn: (move: CubeMove, options?: { report?: boolean; animate?: boolean }) => void;
  /** Put the stickers as given, at once. */
  setState: (state: string) => void;
  /** Back to the way it was first seen. */
  resetLook: () => void;
  /** The stickers once every turn asked for is done. */
  state: () => string;
};

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
  /** Anything a test or a page wants on the cube's box. */
  [data: `data-${string}`]: string | undefined;
};

/**
 * THE CUBE AS A REACT COMPONENT: a thin wrapper round `CubeView`, which does
 * the work. It fills the box it is given: with no `className` that box is a
 * square as wide as its container, and a `className` must position it
 * (relative or absolute) and give it a size.
 */
export function Kyuubu({ ref, className, style, size, state, interactive = true, onTurn, onLook, ...rest }: KyuubuProps) {
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<CubeView | null>(null);
  const handlers = useRef({ onTurn, onLook });
  useEffect(() => {
    handlers.current = { onTurn, onLook };
  }, [onTurn, onLook]);
  const { colours, plastic, keyboard, turnMs, yaw, pitch, fill, label } = rest;
  const data = Object.fromEntries(Object.entries(rest).filter(([key]) => key.startsWith("data-")));

  useEffect(() => {
    if (box.current === null) return;
    const made = new CubeView(box.current, {
      size,
      state,
      interactive,
      colours,
      plastic,
      keyboard,
      turnMs,
      yaw,
      pitch,
      fill,
      label,
      onTurn: (move, now) => handlers.current.onTurn?.(move, now),
      onLook: (y, p) => handlers.current.onLook?.(y, p),
    });
    view.current = made;
    return () => {
      made.destroy();
      view.current = null;
    };
    // Made again only for what cannot be changed on a cube already drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, keyboard, plastic, yaw, pitch, fill, label, JSON.stringify(colours ?? {})]);

  useEffect(() => {
    if (state !== undefined && view.current !== null && view.current.state !== state) view.current.setState(state);
  }, [state]);

  useEffect(() => {
    view.current?.setInteractive(interactive);
  }, [interactive]);

  useImperativeHandle(ref, () => ({
    turn: (move, options) => view.current?.turn(move, options),
    setState: (next) => view.current?.setState(next),
    resetLook: () => view.current?.resetLook(),
    state: () => view.current?.state ?? state ?? "",
  }));

  // With no class of its own the box is a square as wide as its container; a class says where it sits and how big it is, and is left to.
  const boxStyle: CSSProperties = className === undefined ? { position: "relative", width: "100%", aspectRatio: "1 / 1", ...style } : { ...style };
  return <div ref={box} className={className} style={boxStyle} {...data} />;
}
