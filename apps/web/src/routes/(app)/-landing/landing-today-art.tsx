import { cn } from 'cn';
import type { CSSProperties, ReactNode } from 'react';

import type { LandingTodayArt } from '#/features/landing/landing.type';

/**
 * Line drawings in the logo's style: hairline strokes, with a heavy stroke on the right and bottom edge of the main frame.
 * Each line draws itself when the art becomes active.
 */
export function TodayArt({
  art,
  isActive,
  className,
}: {
  art: LandingTodayArt;
  isActive: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden
      data-active={isActive || undefined}
      className={cn(
        'group/art fill-none stroke-current text-fg opacity-0 transition-opacity duration-base data-active:opacity-100',
        className,
      )}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art === 'device' && <DeviceArt />}
      {art === 'open' && <OpenArt />}
      {art === 'sort' && <SortArt />}
    </svg>
  );
}

// *** DeviceArt ***
// A device holding a grid of files: nothing leaves it.
function DeviceArt() {
  const tiles = [0, 1, 2, 3, 4, 5].map((index) => ({
    x: 112 + (index % 3) * 62,
    y: 132 + Math.floor(index / 3) * 72,
  }));

  return (
    <>
      <FramePaths
        x={64}
        y={72}
        width={272}
        height={256}
        radius={40}
        order={0}
      />
      {tiles.map((tile, index) => (
        <Line
          key={index}
          order={2 + index}
          d={roundedRect(tile.x, tile.y, 52, 60, 10)}
        />
      ))}
      <Line order={9} d="M150 352 H250" />
      <Dot cx={318} cy={98} color="green" order={10} />
    </>
  );
}

// *** OpenArt ***
// A window swung open: no door to unlock, just come in.
function OpenArt() {
  return (
    <>
      <FramePaths
        x={64}
        y={64}
        width={272}
        height={272}
        radius={40}
        order={0}
      />
      <Line order={2} d="M200 64 V336" />
      <Line order={3} d="M200 92 L292 120 V280 L200 308" />
      <Line order={4} d="M268 196 V212" />
      <Line order={5} d="M104 140 L160 140" />
      <Line order={6} d="M104 176 L148 176" />
      <Line order={7} d="M104 212 L136 212" />
      <Dot cx={160} cy={280} color="blue" order={8} />
    </>
  );
}

// *** SortArt ***
// Cards dropping into a collection's pocket.
function SortArt() {
  return (
    <>
      <Line
        order={0}
        d={roundedRect(118, 70, 92, 112, 14)}
        transform="rotate(-10 164 126)"
      />
      <Line
        order={1}
        d={roundedRect(186, 58, 92, 112, 14)}
        transform="rotate(6 232 114)"
      />
      <Line
        order={2}
        d={roundedRect(150, 120, 92, 112, 14)}
        transform="rotate(-2 196 176)"
      />
      <Line
        order={3}
        d="M84 210 H160 L180 232 H316 A28 28 0 0 1 344 260 V312 A28 28 0 0 1 316 340 H84 A28 28 0 0 1 56 312 V238 A28 28 0 0 1 84 210 Z"
      />
      <Line
        order={4}
        heavy
        d="M316 232 A28 28 0 0 1 344 260 V312 A28 28 0 0 1 316 340 H84"
      />
      <Dot cx={92} cy={244} color="pink" order={6} />
    </>
  );
}

// *** FramePaths ***
// The logo's frame: a full hairline, then a heavy stroke along the right and bottom.
function FramePaths({
  x,
  y,
  width,
  height,
  radius,
  order,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  order: number;
}) {
  const right = x + width;
  const bottom = y + height;

  return (
    <>
      <Line order={order} d={roundedRect(x, y, width, height, radius)} />
      <Line
        order={order + 1}
        heavy
        d={`M${right - radius} ${y} A${radius} ${radius} 0 0 1 ${right} ${y + radius} V${bottom - radius} A${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H${x + radius}`}
      />
    </>
  );
}

// *** Line ***
// pathLength=1 lets one dash value draw any path; the transition only runs while active, so leaving resets at once.
function Line({
  d,
  order,
  heavy = false,
  transform,
}: {
  d: string;
  order: number;
  heavy?: boolean;
  transform?: string;
}) {
  return (
    <path
      d={d}
      pathLength={1}
      transform={transform}
      strokeWidth={heavy ? 7 : 1.75}
      style={{ '--order': order } as CSSProperties}
      className="[stroke-dasharray:1] [stroke-dashoffset:1] group-data-active/art:transition-[stroke-dashoffset] group-data-active/art:delay-[calc(var(--order)*110ms)] group-data-active/art:duration-[1100ms] group-data-active/art:ease-in-out-quart group-data-active/art:[stroke-dashoffset:0] motion-reduce:[stroke-dashoffset:0]"
    />
  );
}

// *** Dot ***
// The folder colors, used as one small moment per drawing.
const DOT_FILL: Record<string, string> = {
  green: 'fill-(--poise-color-folder-green)',
  blue: 'fill-(--poise-color-folder-blue)',
  pink: 'fill-(--poise-color-folder-pink)',
};

function Dot({
  cx,
  cy,
  color,
  order,
}: {
  cx: number;
  cy: number;
  color: string;
  order: number;
}): ReactNode {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={9}
      style={{ '--order': order } as CSSProperties}
      className={cn(
        'stroke-none opacity-0 group-data-active/art:opacity-100 group-data-active/art:transition-opacity group-data-active/art:delay-[calc(var(--order)*110ms)] group-data-active/art:duration-slow motion-reduce:opacity-100',
        DOT_FILL[color],
      )}
    />
  );
}

// *** roundedRect ***
function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = x + width;
  const bottom = y + height;

  return `M${x + radius} ${y} H${right - radius} A${radius} ${radius} 0 0 1 ${right} ${y + radius} V${bottom - radius} A${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H${x + radius} A${radius} ${radius} 0 0 1 ${x} ${bottom - radius} V${y + radius} A${radius} ${radius} 0 0 1 ${x + radius} ${y} Z`;
}
