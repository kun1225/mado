import type {
  LandingFloat,
  LandingRect,
  LandingSectionBounds,
  LandingTilePose,
} from './landing.type';

/** How far a scroll progress is through the phase from `start` to `end`, 0 to 1. */
export function phaseProgress(progress: number, start: number, end: number) {
  return clamp((progress - start) / (end - start), 0, 1);
}

/** Which of `count` equal steps a scroll progress (0 to 1) is in. */
export function pickActiveStep(progress: number, count: number) {
  return clamp(Math.floor(progress * count), 0, count - 1);
}

/** How far a single step's bar is filled, 0 to 1. */
export function stepProgress(progress: number, count: number, index: number) {
  return clamp(progress * count - index, 0, 1);
}

/**
 * The part of a step's progress that demo item `index` moves in.
 * Slices overlap so the items flow together, and the last ends early so the finished demo holds a moment.
 */
export function demoSlice(index: number): [number, number] {
  const start = DEMO_SLICE_START + index * DEMO_SLICE_GAP;
  return [start, start + DEMO_SLICE_LENGTH];
}

const DEMO_SLICE_START = 0.05;
const DEMO_SLICE_GAP = 0.15;
const DEMO_SLICE_LENGTH = 0.25;

/** The id of the section that crosses the line `y`, or null when none does. */
export function pickActiveSection(sections: LandingSectionBounds[], y: number) {
  return (
    sections.find((section) => section.top <= y && section.bottom > y)?.id ??
    null
  );
}

/**
 * Which search query shows, and how many of its letters are typed.
 * Each query owns an equal share of the scroll: the first part types it, the rest holds it so the matches can be seen.
 */
export function searchFrame(progress: number, lengths: readonly number[]) {
  const index = pickActiveStep(progress, lengths.length);
  const local = stepProgress(progress, lengths.length, index);
  return {
    index,
    length: Math.round(
      phaseProgress(local, 0, SEARCH_TYPE_SHARE) * lengths[index],
    ),
  };
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

/** Where a tile waits during the intro: in one row across the middle, all the same width. */
export function introRowFloat(
  rank: number,
  count: number,
  stage: { width: number; height: number },
  slotWidth: number,
): LandingFloat {
  const width = Math.min(
    INTRO_ROW_TILE_MAX,
    stage.width / INTRO_ROW_TILES_ON_SCREEN,
  );
  const offset = (rank - (count - 1) / 2) * width * INTRO_ROW_SPACING;
  return {
    x: 0.5 + offset / stage.width,
    y: 0.5,
    scale: width / slotWidth,
    rotate: 0,
  };
}

export function mixFloat(from: LandingFloat, to: LandingFloat, t: number) {
  // Weighted, so t = 1 lands exactly on `to` with no float error.
  const mix = (a: number, b: number) => a * (1 - t) + b * t;
  return {
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    scale: mix(from.scale, to.scale),
    rotate: mix(from.rotate, to.rotate),
  };
}

/**
 * Masonry by hand: each tile goes to the column that is shortest so far.
 * Why not CSS `columns`: Safari doesn't paint transformed or animated children in any column but the first.
 */
export function splitIntoColumns<T extends { width: number; height: number }>(
  tiles: readonly T[],
  count: number,
): T[][] {
  const empty = Array.from({ length: count }, () => ({
    tiles: [] as T[],
    height: 0,
  }));
  return tiles
    .reduce((columns, tile) => {
      const heights = columns.map((column) => column.height);
      const shortest = heights.indexOf(Math.min(...heights));
      return columns.map((column, index) =>
        index === shortest
          ? {
              tiles: [...column.tiles, tile],
              height: column.height + tile.height / tile.width,
            }
          : column,
      );
    }, empty)
    .map((column) => column.tiles);
}

const SEARCH_TYPE_SHARE = 0.5;
const INTRO_ROW_TILE_MAX = 140;
const INTRO_ROW_TILES_ON_SCREEN = 7;
const INTRO_ROW_SPACING = 1.12;

// *** clamp ***
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// *** easeInOut ***
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
