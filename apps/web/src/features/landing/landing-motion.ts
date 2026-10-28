import type {
  LandingFloat,
  LandingRect,
  LandingTilePose,
} from './landing.type';

/** Which of `count` equal steps a scroll progress (0 to 1) is in. */
export function pickActiveStep(progress: number, count: number) {
  return clamp(Math.floor(progress * count), 0, count - 1);
}

/** How far a single step's bar is filled, 0 to 1. */
export function stepProgress(progress: number, count: number, index: number) {
  return clamp(progress * count - index, 0, 1);
}

export function tilePose(
  slot: LandingRect,
  stage: { width: number; height: number },
  float: LandingFloat,
  progress: number,
): LandingTilePose {
  const eased = easeInOut(clamp(progress, 0, 1));
  const left = 1 - eased;
  const dx = float.x * stage.width - (slot.left + slot.width / 2);
  const dy = float.y * stage.height - (slot.top + slot.height / 2);

  // `+ 0` turns -0 into 0, so a settled tile compares equal to its slot.
  return {
    x: dx * left + 0,
    y: dy * left + 0,
    scale: float.scale + (1 - float.scale) * eased,
    rotate: float.rotate * left + 0,
  };
}

// *** clamp ***
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// *** easeInOut ***
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
