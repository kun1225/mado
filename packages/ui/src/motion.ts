export type Spring = {
  readonly type: 'spring';
  readonly visualDuration: number;
  readonly bounce?: number;
};

export const springs = {
  micro: { type: 'spring', visualDuration: 0.12, bounce: 0.15 },
  snappy: { type: 'spring', visualDuration: 0.2, bounce: 0.3 },
  precise: { type: 'spring', visualDuration: 0.25 },
  smooth: { type: 'spring', visualDuration: 0.4, bounce: 0.5 },
  bouncy: { type: 'spring', visualDuration: 0.3, bounce: 0.4 },
  gentle: { type: 'spring', visualDuration: 0.5, bounce: 0.15 },
  slow: { type: 'spring', visualDuration: 0.7, bounce: 0.2 },
  playful: { type: 'spring', visualDuration: 0.35, bounce: 0.6 },
  exit: { type: 'spring', visualDuration: 0.15 },
} as const satisfies Record<string, Spring>;

export type SpringName = keyof typeof springs;

export type Ease = {
  readonly type: 'tween';
  readonly duration: number;
  readonly ease: readonly [number, number, number, number];
};

export const eases = {
  standard: { type: 'tween', duration: 0.18, ease: [0.4, 0, 0.2, 1] },
  middle: { type: 'tween', duration: 0.24, ease: [0.4, 0, 0.2, 1] },
} as const satisfies Record<string, Ease>;

export type EaseName = keyof typeof eases;
