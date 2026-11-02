import { useState } from 'react';
import {
  ComputerIcon,
  Image01Icon,
  Link01Icon,
  Note01Icon,
  PaintBoardIcon,
  PencilEdit02Icon,
  Video01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { MotionValue } from 'motion/react';
import {
  easeOut,
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

import {
  MorphContextMenu,
  MorphContextMenuContent,
  MorphContextMenuItem,
  MorphContextMenuTrigger,
} from '@repo/ui/morph-context-menu';

import { CollectionPocket } from '#/components/collection-card-pocket';
import { CollectionColorDialog } from '#/components/collection-context-menu/collection-color-dialog';
import { CollectionRenameDialog } from '#/components/collection-context-menu/collection-rename-dialog';
import type { CollectionColor } from '#/features/collections/collection-types';
import type { LandingSortFolder } from '#/features/landing/landing.type';
import { findLandingTile } from '#/features/landing/landing-content';
import { demoSlice } from '#/features/landing/landing-motion';

import { LAPTOP, Laptop, LAPTOP_FACE_CAMERA } from './landing-laptop';
import { TileMedia } from './landing-ui';

const LIFT = { y: -8, scale: 1.02 };
const LIFT_SPRING = { type: 'spring', duration: 0.35, bounce: 0.15 } as const;

/** Four kinds of saves drop into one library, one after another, as the step scrolls. */
export function DemoAllTypes({ progress }: { progress: MotionValue<number> }) {
  return (
    <DemoPanel>
      {/* Two columns like the library, so every card keeps its own aspect ratio. */}
      <div className="flex shrink-0 gap-4 max-md:scale-[0.7]">
        {[0, 1].map((column) => (
          <div key={column} className="flex w-56 flex-col gap-4">
            {ALL_TYPES.map(
              (item, index) =>
                index % 2 === column && (
                  <DropCard key={item.label} index={index} progress={progress}>
                    <AllTypesCard item={item} />
                  </DropCard>
                ),
            )}
          </div>
        ))}
      </div>
    </DemoPanel>
  );
}

// Image and website go in the first column, video and note in the second: each save joins the shorter column, as in the library.
const ALL_TYPES: { label: string; icon: IconSvgElement; tileId?: string }[] = [
  { label: 'Image', icon: Image01Icon, tileId: 'neuro-pop' },
  { label: 'Video', icon: Video01Icon, tileId: 'heist-button' },
  { label: 'Website', icon: Link01Icon, tileId: 'house-of-honey' },
  { label: 'Note', icon: Note01Icon },
];

/** Loose saves fly into their folders as the step scrolls, and each count goes up when one lands. */
export function DemoSort({ progress }: { progress: MotionValue<number> }) {
  // Seeded from the current value, because a jump into the step mounts the demo mid-way.
  const [landed, setLanded] = useState(() => countLanded(progress.get()));
  useMotionValueEvent(progress, 'change', (value) =>
    setLanded(countLanded(value)),
  );

  return (
    <DemoPanel>
      {/* Fixed size, so each card's path to its folder is known in pixels. Phones scale the whole box. */}
      <div className="flex shrink-0 flex-col items-center max-md:scale-[0.6]">
        <div
          style={{ width: SORT_WIDTH, height: SORT_HEIGHT }}
          className="relative"
        >
          {SORT_CARDS.map((card, index) => (
            <SortCard
              key={card.tileId}
              card={card}
              index={index}
              progress={progress}
            />
          ))}

          {SORT_FOLDERS.map((folder) => (
            <SortFolder
              key={folder.name}
              folder={folder}
              landedTileIds={SORT_CARDS.slice(0, landed)
                .filter((card) => card.folder === folder.name)
                .map((card) => card.tileId)}
            />
          ))}
        </div>

        <p className="mt-6 t-b-3 text-muted-fg">
          Right-click a folder to rename it or change its color.
        </p>
      </div>
    </DemoPanel>
  );
}

const SORT_WIDTH = 480;
const SORT_HEIGHT = 368;
const SORT_CARD = { width: 96, height: 128, gap: 16 };
const SORT_FOLDER_SIZE = 192;
const SORT_FOLDER_TOP = SORT_HEIGHT - SORT_FOLDER_SIZE;
/** The folder card's pocket is centered in its top part, and a save lands at the pocket's front edge. */
const SORT_DROP_Y = SORT_FOLDER_TOP + 52 - SORT_CARD.height / 2;

const SORT_FOLDERS: LandingSortFolder[] = [
  {
    name: 'Brand',
    color: 'green',
    left: 32,
    saves: 2,
    previewTileIds: ['neuro-pop'],
  },
  {
    name: 'Web Design',
    color: 'blue',
    left: 256,
    saves: 36,
    previewTileIds: ['cole-derochie'],
  },
];

const SORT_CARDS = [
  { tileId: 'cleo-y-teo', folder: 'Brand' },
  { tileId: 'nothin', folder: 'Web Design' },
  { tileId: 'petrichor', folder: 'Brand' },
  { tileId: 'era', folder: 'Web Design' },
].map((card, index) => {
  const left =
    (SORT_WIDTH - 4 * SORT_CARD.width - 3 * SORT_CARD.gap) / 2 +
    index * (SORT_CARD.width + SORT_CARD.gap);
  const folder = SORT_FOLDERS.find((item) => item.name === card.folder)!;
  const folderCenter = folder.left + SORT_FOLDER_SIZE / 2;

  return { ...card, left, dx: folderCenter - (left + SORT_CARD.width / 2) };
});

/** A closed laptop opens as the step scrolls. The library lifts out of its screen and lands in a folder: your files, on your computer. */
export function DemoLocal({ progress }: { progress: MotionValue<number> }) {
  const prefersReducedMotion = useReducedMotion();
  const lidAngle = useTransform(progress, (value): number =>
    prefersReducedMotion ? LAPTOP.openAngle : lidCurve(value),
  );
  // The laptop slides right to make room for the folder.
  const panX = useTransform(
    progress,
    [LOCAL_OPEN_END, LOCAL_PAN_END],
    [0, prefersReducedMotion ? 0 : LOCAL_PAN],
  );
  const [landed, setLanded] = useState(() => countLocalLanded(progress.get()));
  useMotionValueEvent(progress, 'change', (value) =>
    setLanded(countLocalLanded(value)),
  );

  return (
    <DemoPanel>
      <div className="flex shrink-0 scale-[0.88] flex-col items-center max-md:scale-[0.6]">
        <motion.div
          style={{ x: panX }}
          whileHover={{ ...LIFT, transition: LIFT_SPRING }}
        >
          <Laptop lidAngle={lidAngle} screen={null}>
            {LOCAL_TILES.map((tile) => (
              <LocalTile
                key={tile.id}
                tile={tile}
                progress={progress}
                isStill={prefersReducedMotion}
              />
            ))}
            <LocalFolder progress={progress} landed={landed} />
          </Laptop>
        </motion.div>

        <p className="mt-20 flex items-center gap-2 t-b-2 text-muted-fg">
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

// The lid opens first, then the tiles leave one after another. The last lands by 0.77, so a click on the step shows it finished.
const LOCAL_OPEN_END = 0.28;
const LOCAL_FLY = { start: 0.32, gap: 0.05, length: 0.2 };
const LOCAL_PAN_END = 0.6;
const LOCAL_PAN = 60;
const LOCAL_SCREEN_PAD = 8;
const LOCAL_TILE_GAP = 8;
const LOCAL_TILE_WIDTH =
  (LAPTOP.lidWidth -
    2 * LAPTOP.bezel -
    2 * LOCAL_SCREEN_PAD -
    2 * LOCAL_TILE_GAP) /
  3;
const LOCAL_TILE_HEIGHT = (LOCAL_TILE_WIDTH * 3) / 4;
/** The folder's pocket, in the lid's frame: left of the screen, halfway down. */
const LOCAL_FOLDER = { x: -160, y: 160, width: 128 };

// Each tile starts on its slot in the screen's grid, and flies to the folder's front edge.
const LOCAL_TILES = LOCAL_TILE_IDS.map((id, index) => {
  const left =
    LAPTOP.bezel +
    LOCAL_SCREEN_PAD +
    (index % 3) * (LOCAL_TILE_WIDTH + LOCAL_TILE_GAP);
  const top =
    LAPTOP.bezel +
    LOCAL_SCREEN_PAD +
    Math.floor(index / 3) * (LOCAL_TILE_HEIGHT + LOCAL_TILE_GAP);
  const start = LOCAL_FLY.start + index * LOCAL_FLY.gap;

  return {
    id,
    left,
    top,
    dx: LOCAL_FOLDER.x - (left + LOCAL_TILE_WIDTH / 2),
    dy: LOCAL_FOLDER.y - 14 - (top + LOCAL_TILE_HEIGHT / 2),
    slice: [start, start + LOCAL_FLY.length] as [number, number],
  };
});

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
      className="size-full perspective-[1400px]"
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

// *** AllTypesCard ***
/** A save at its own aspect ratio. A note is its text in the serif the library's note cards use. */
function AllTypesCard({ item }: { item: (typeof ALL_TYPES)[number] }) {
  const tile = item.tileId ? findLandingTile(item.tileId) : null;

  return (
    <div
      style={tile ? { aspectRatio: tile.width / tile.height } : undefined}
      className="relative"
    >
      {tile ? (
        <TileMedia tile={tile} />
      ) : (
        // Padding sits outside the clamp, or the cut line shows through it. The extra bottom keeps the text clear of the badge.
        <div className="p-5 pb-14">
          <p className="line-clamp-4 t-h-7 text-pretty">
            If there’s something you want to do, just do it. Do it awkwardly.
            Everyone starts as a beginner.
          </p>
        </div>
      )}
      <TypeBadge icon={item.icon} label={item.label} />
    </div>
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
      // A landed card is invisible but stays over its folder, so it must not catch the right-click or the hover.
      className="pointer-events-none absolute top-0 z-10 h-32 w-24 overflow-hidden rounded-lg shadow-md motion-reduce:transform-none!"
    >
      <TileMedia tile={findLandingTile(card.tileId)} />
    </motion.div>
  );
}

// *** SortFolder ***
/** The library's own folder card. Right-click opens the same rename and color dialogs, kept in this demo only. */
function SortFolder({
  folder,
  landedTileIds,
}: {
  folder: LandingSortFolder;
  landedTileIds: string[];
}) {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState<CollectionColor | null>(folder.color);
  const [openDialog, setOpenDialog] = useState<'rename' | 'color' | null>(null);
  const saves = folder.saves + landedTileIds.length;

  function handleOpenChange(open: boolean) {
    if (!open) setOpenDialog(null);
  }

  return (
    <>
      <MorphContextMenu>
        <MorphContextMenuTrigger
          render={
            <div
              style={{
                left: folder.left,
                top: SORT_FOLDER_TOP,
                width: SORT_FOLDER_SIZE,
                height: SORT_FOLDER_SIZE,
              }}
              className="absolute"
            />
          }
        >
          <motion.div
            whileHover={{ ...LIFT, transition: LIFT_SPRING }}
            className="group relative size-full rounded-md border border-border bg-bg"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-14 flex items-center justify-center">
              <CollectionPocket
                color={color}
                previews={[...folder.previewTileIds, ...landedTileIds].map(
                  (id) => {
                    const tile = findLandingTile(id);
                    return {
                      id,
                      width: tile.width,
                      height: tile.height,
                      media: (
                        <TileMedia
                          tile={tile}
                          loading="eager"
                          className="rounded-none"
                        />
                      ),
                    };
                  },
                )}
              />
            </div>
            <div className="absolute inset-x-4 bottom-3 min-w-0">
              <p className="truncate t-l-2">{name}</p>
              <p className="t-b-3 text-muted-fg tabular-nums">
                {saves} {saves === 1 ? 'save' : 'saves'}
              </p>
            </div>
          </motion.div>
        </MorphContextMenuTrigger>

        <MorphContextMenuContent className="min-w-44">
          <MorphContextMenuItem onClick={() => setOpenDialog('rename')}>
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              size={16}
              strokeWidth={1.5}
            />
            Rename
          </MorphContextMenuItem>
          <MorphContextMenuItem onClick={() => setOpenDialog('color')}>
            <HugeiconsIcon icon={PaintBoardIcon} size={16} strokeWidth={1.5} />
            Change color
          </MorphContextMenuItem>
        </MorphContextMenuContent>
      </MorphContextMenu>

      <CollectionRenameDialog
        collection={{ name }}
        open={openDialog === 'rename'}
        onOpenChange={handleOpenChange}
        onSave={(next) => {
          setName(next);
          setOpenDialog(null);
        }}
        isSaving={false}
        isError={false}
      />

      <CollectionColorDialog
        collection={{ name, color }}
        open={openDialog === 'color'}
        onOpenChange={handleOpenChange}
        onSave={(next) => {
          setColor(next);
          setOpenDialog(null);
        }}
        isSaving={false}
        isError={false}
      />
    </>
  );
}

// *** LocalTile ***
/** A save on the laptop's screen. It lifts off, turns to face you, and shrinks into the folder. */
function LocalTile({
  tile,
  progress,
  isStill,
}: {
  tile: (typeof LOCAL_TILES)[number];
  progress: MotionValue<number>;
  isStill: boolean | null;
}) {
  const { slice } = tile;
  const middle = (slice[0] + slice[1]) / 2;
  const x = useTransform(progress, slice, [0, tile.dx]);
  const y = useTransform(progress, slice, [0, tile.dy]);
  // Up and over, so it clears the screen's edge instead of sliding along it.
  const z = useTransform(progress, [slice[0], middle, slice[1]], [1, 80, 1]);
  const scale = useTransform(progress, slice, [1, 0.45]);
  const rotateX = useTransform(progress, slice, [0, 8]);
  const rotateY = useTransform(progress, slice, [0, LAPTOP.viewTurn]);
  // Fades only at the end of the flight, so it reads as going into the folder.
  const opacity = useTransform(
    progress,
    transform([slice[0] + (slice[1] - slice[0]) * 0.8, slice[1]], [1, 0]),
  );

  return (
    <motion.div
      style={{
        left: tile.left,
        top: tile.top,
        width: LOCAL_TILE_WIDTH,
        height: LOCAL_TILE_HEIGHT,
        opacity,
        ...(isStill ? {} : { x, y, z, scale, rotateX, rotateY }),
      }}
      className="absolute overflow-hidden rounded-sm [backface-visibility:hidden]"
    >
      <TileMedia tile={findLandingTile(tile.id)} className="rounded-sm" />
    </motion.div>
  );
}

// *** LocalFolder ***
/** The library's folder, standing beside the laptop and turned to face you. It shows the first saves that land. */
function LocalFolder({
  progress,
  landed,
}: {
  progress: MotionValue<number>;
  landed: number;
}) {
  const opacity = useTransform(
    progress,
    transform([LOCAL_FLY.start - 0.02, LOCAL_FLY.start + 0.04], [0, 1]),
  );

  return (
    <motion.div
      style={{
        left: LOCAL_FOLDER.x - LOCAL_FOLDER.width / 2,
        top: LOCAL_FOLDER.y - 48,
        width: LOCAL_FOLDER.width,
        opacity,
        transform: LAPTOP_FACE_CAMERA,
      }}
      className="group absolute flex flex-col items-center"
    >
      <CollectionPocket
        color="orange"
        previews={LOCAL_TILES.slice(0, Math.min(landed, 3)).map(({ id }) => {
          const tile = findLandingTile(id);
          return {
            id,
            width: tile.width,
            height: tile.height,
            media: (
              <TileMedia tile={tile} loading="eager" className="rounded-none" />
            ),
          };
        })}
      />
      <p className="mt-3 t-l-2">mado-export</p>
      <p className="t-b-3 text-muted-fg tabular-nums">
        {landed} {landed === 1 ? 'save' : 'saves'}
      </p>
    </motion.div>
  );
}

// *** lidCurve ***
/** Opens fast and settles slowly, like a hand easing a lid up. */
const lidCurve = transform(
  [0, LOCAL_OPEN_END],
  [LAPTOP.closedAngle, LAPTOP.openAngle],
  { ease: easeOut },
);

// *** countLocalLanded ***
function countLocalLanded(progress: number) {
  return LOCAL_TILES.filter((tile) => progress >= tile.slice[1]).length;
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
