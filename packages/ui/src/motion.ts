export type Spring = {
  readonly type: "spring";
  /**
   * Seconds until the value first reaches its target - which is when the eye
   * reads the move as finished. Whatever bouncing follows is decoration, so
   * this, not the settling time, is the animation's felt speed.
   */
  readonly visualDuration: number;
  /** How far past the target it carries. 0 never overshoots, 1 rings on. */
  readonly bounce: number;
};

export const springs = {
  /** Buttons, toggles, anything under the pointer. */
  snappy: { type: "spring", visualDuration: 0.2, bounce: 0.3 },
  /** Panels, popovers, layout shifts. */
  smooth: { type: "spring", visualDuration: 0.4, bounce: 0.5 },
  /** Deliberate overshoot. Use sparingly. */
  bouncy: { type: "spring", visualDuration: 0.3, bounce: 0.4 },
} as const satisfies Record<string, Spring>;

export type SpringName = keyof typeof springs;

/** Duration-based alternative to a spring - no overshoot, ever. */
export type Ease = {
  readonly type: "tween";
  readonly duration: number;
  readonly ease: readonly [number, number, number, number];
};

export const eases = {
  standard: { type: "tween", duration: 0.18, ease: [0.4, 0, 0.2, 1] },
  middle: { type: "tween", duration: 0.24, ease: [0.4, 0, 0.2, 1] },
} as const satisfies Record<string, Ease>;

export type EaseName = keyof typeof eases;
