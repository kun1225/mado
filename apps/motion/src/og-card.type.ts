export type OgCardTile = {
  /** File name in apps/web/public/landing, without `.webp`. */
  id: string;
  x: number;
  y: number;
  width: number;
  tilt: number;
  /** Start point of the float cycle, in radians, so the tiles don't bob together. */
  phase: number;
};
