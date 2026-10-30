import { useState } from 'react';
import {
  ComputerIcon,
  FileZipIcon,
  Image01Icon,
  Link01Icon,
  Note01Icon,
  Video01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { MotionValue } from 'motion/react';
import {
  motion,
  transform,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';

import { findLandingTile } from '#/features/landing/landing-content';
import { demoSlice } from '#/features/landing/landing-motion';

import { TileMedia } from './landing-ui';

const LIFT = { y: -8, scale: 1.02 };
const LIFT_SPRING = { type: 'spring', duration: 0.35, bounce: 0.15 } as const;

/** Four kinds of saves drop into one library, one after another, as the step scrolls. */
export function DemoAllTypes({ progress }: { progress: MotionValue<number> }) {
  return (
    <DemoPanel>
      <div className="grid aspect-square h-full max-h-[560px] max-w-full grid-cols-2 grid-rows-2 gap-4">
        {ALL_TYPES.map((item, index) => (
          <DropCard key={item.label} index={index} progress={progress}>
            {item.tileId ? (
              <TileMedia tile={findLandingTile(item.tileId)} />
            ) : (
              <p className="p-5 t-b-2 text-pretty">
                If there’s something you want to do, just do it. Do it
                awkwardly. Everyone starts as a beginner.
              </p>
            )}
            <TypeBadge icon={item.icon} label={item.label} />
          </DropCard>
        ))}
      </div>
    </DemoPanel>
  );
}

const ALL_TYPES: { label: string; icon: IconSvgElement; tileId?: string }[] = [
  { label: 'Image', icon: Image01Icon, tileId: 'neuro-pop' },
  { label: 'Video', icon: Video01Icon, tileId: 'heist-button' },
  { label: 'Website', icon: Link01Icon, tileId: 'house-of-honey' },
  { label: 'Note', icon: Note01Icon },
];

/** Loose saves fly into their collections as the step scrolls, and each count goes up when one lands. */
export function DemoSort({ progress }: { progress: MotionValue<number> }) {
  // Seeded from the current value, because a jump into the step mounts the demo mid-way.
  const [landed, setLanded] = useState(() => countLanded(progress.get()));
  useMotionValueEvent(progress, 'change', (value) =>
    setLanded(countLanded(value)),
  );

  return (
    <DemoPanel>
      {/* Fixed size, so each card's path to its folder is known in pixels. Phones scale the whole box. */}
      <div className="relative h-[380px] w-[520px] shrink-0 max-md:scale-[0.6]">
        {SORT_CARDS.map((card, index) => (
          <SortCard
            key={card.tileId}
            card={card}
            index={index}
            progress={progress}
          />
        ))}

        {SORT_FOLDERS.map((folder) => (
          <motion.div
            key={folder.name}
            style={{ left: folder.left }}
            whileHover={{ ...LIFT, transition: LIFT_SPRING }}
            className="absolute top-[200px] flex w-[180px] flex-col items-center"
          >
            <div className="relative mt-3 h-24 w-32 rounded-md rounded-tl-none bg-border">
              <div className="absolute -top-3 left-0 h-3 w-12 rounded-t-md bg-border" />
            </div>
            <p className="mt-3 t-l-1">{folder.name}</p>
            <p className="t-b-3 text-muted-fg tabular-nums">
              {folder.saves +
                SORT_CARDS.slice(0, landed).filter(
                  (card) => card.folder === folder.name,
                ).length}{' '}
              saves
            </p>
          </motion.div>
        ))}
      </div>
    </DemoPanel>
  );
}

// Folder centers are at 150px and 370px; a card is 96px wide, so `dx` moves its center onto its folder's.
const SORT_CARDS = [
  { tileId: 'cleo-y-teo', left: 34, dx: 68, folder: 'Brand' },
  { tileId: 'nothin', left: 154, dx: 168, folder: 'Web Design' },
  { tileId: 'petrichor', left: 274, dx: -172, folder: 'Brand' },
  { tileId: 'era', left: 394, dx: -72, folder: 'Web Design' },
];

const SORT_FOLDERS = [
  { name: 'Brand', left: 60, saves: 2 },
  { name: 'Web Design', left: 280, saves: 36 },
];

const SORT_DROP_Y = 236;

/** The library sits inside a computer. A zip goes out and comes back in as the step scrolls, for export and import. */
export function DemoLocal({ progress }: { progress: MotionValue<number> }) {
  const zipX = useTransform(progress, [0.1, 0.4, 0.6, 0.9], [0, 150, 150, 0]);
  const zipOpacity = useTransform(
    progress,
    transform([0.1, 0.25, 0.75, 0.9], [0, 1, 1, 0]),
  );

  return (
    <DemoPanel>
      <div className="flex shrink-0 flex-col items-center max-md:scale-[0.7]">
        <div className="relative">
          <motion.div
            whileHover={{ ...LIFT, transition: LIFT_SPRING }}
            className="w-[400px] rounded-xl border border-border bg-bg p-3 shadow-sm"
          >
            <div className="grid grid-cols-3 gap-2">
              {LOCAL_TILE_IDS.map((id) => (
                <div
                  key={id}
                  className="aspect-[4/3] overflow-hidden rounded-sm"
                >
                  <TileMedia
                    tile={findLandingTile(id)}
                    className="rounded-sm"
                  />
                </div>
              ))}
            </div>
          </motion.div>
          <div className="mx-auto h-3 w-[460px] rounded-b-xl bg-border" />

          <motion.div
            style={{ x: zipX, opacity: zipOpacity }}
            className="absolute top-1/2 left-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-fg px-3.5 py-2 t-l-2 whitespace-nowrap text-bg shadow-md motion-reduce:transform-none!"
          >
            <HugeiconsIcon icon={FileZipIcon} size={16} strokeWidth={1.5} />
            mado-export.zip
          </motion.div>
        </div>

        <p className="mt-8 flex items-center gap-2 t-b-2 text-muted-fg">
          <HugeiconsIcon icon={ComputerIcon} size={18} strokeWidth={1.5} />
          On this device. Nothing uploaded.
        </p>
      </div>
    </DemoPanel>
  );
}

const LOCAL_TILE_IDS = [
  'neuro-pop',
  'typography',
  'cleo-y-teo',
  'supahero',
  'pattern',
  'thiings',
];

// *** DemoPanel ***
/** The panel tilts toward the mouse and catches a soft light, so the demo feels like an object you can turn. */
function DemoPanel({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateY = useSpring(
    useTransform(pointerX, [0, 1], [-MAX_TILT, MAX_TILT]),
    TILT_SPRING,
  );
  const rotateX = useSpring(
    useTransform(pointerY, [0, 1], [MAX_TILT, -MAX_TILT]),
    TILT_SPRING,
  );
  const sheenX = useTransform(pointerX, (value) => `${value * 100}%`);
  const sheenY = useTransform(pointerY, (value) => `${value * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(520px circle at ${sheenX} ${sheenY}, rgb(255 255 255 / 0.28), transparent 60%)`;
  const [isHovered, setIsHovered] = useState(false);

  // Only a mouse tilts it; a finger would tilt the panel while scrolling past.
  function track(event: PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
    setIsHovered(true);
  }

  function reset() {
    pointerX.set(0.5);
    pointerY.set(0.5);
    setIsHovered(false);
  }

  return (
    <div
      className="size-full [perspective:1400px]"
      onPointerMove={track}
      onPointerLeave={reset}
    >
      <motion.div
        style={{ rotateX, rotateY }}
        className="relative size-full rounded-xl"
      >
        <div className="flex size-full items-center justify-center overflow-hidden rounded-xl bg-muted p-8">
          {children}
        </div>
        <motion.div
          aria-hidden
          style={{ backgroundImage: sheen }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light"
        />
      </motion.div>
    </div>
  );
}

const MAX_TILT = 6;
const TILT_SPRING = { stiffness: 160, damping: 22, mass: 0.6 };

// *** DropCard ***
function DropCard({
  index,
  progress,
  children,
}: {
  index: number;
  progress: MotionValue<number>;
  children: ReactNode;
}) {
  const slice = demoSlice(index);
  const opacity = useTransform(progress, transform(slice, [0, 1]));
  const y = useTransform(progress, slice, [-40, 0]);
  const scale = useTransform(progress, slice, [0.94, 1]);

  return (
    // The scroll drives the outer box and the hover drives the inner one, so the two transforms don't fight.
    <motion.div
      style={{ opacity, y, scale }}
      className="motion-reduce:transform-none!"
    >
      <motion.div
        whileHover={{ ...LIFT, transition: LIFT_SPRING }}
        className="relative size-full overflow-hidden rounded-lg bg-bg shadow-sm transition-shadow duration-200 hover:shadow-lg"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// *** SortCard ***
function SortCard({
  card,
  index,
  progress,
}: {
  card: (typeof SORT_CARDS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const slice = demoSlice(index);
  const x = useTransform(progress, slice, [0, card.dx]);
  const y = useTransform(progress, slice, [0, SORT_DROP_Y]);
  const scale = useTransform(progress, slice, [1, 0.5]);
  // Fades only at the end of the flight, so it reads as going into the folder.
  const opacity = useTransform(
    progress,
    transform([slice[0] + (slice[1] - slice[0]) * 0.7, slice[1]], [1, 0]),
  );

  return (
    <motion.div
      style={{ left: card.left, x, y, scale, opacity }}
      className="absolute top-0 z-10 h-32 w-24 overflow-hidden rounded-lg shadow-md motion-reduce:transform-none!"
    >
      <TileMedia tile={findLandingTile(card.tileId)} />
    </motion.div>
  );
}

// *** countLanded ***
function countLanded(progress: number) {
  return SORT_CARDS.filter((_, index) => progress >= demoSlice(index)[1])
    .length;
}

// *** TypeBadge ***
function TypeBadge({ icon, label }: { icon: IconSvgElement; label: string }) {
  return (
    <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-bg/90 px-2.5 py-1 t-l-3 text-fg shadow-sm">
      <HugeiconsIcon icon={icon} size={14} strokeWidth={1.5} />
      {label}
    </span>
  );
}
