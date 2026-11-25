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
import { HugeiconsIcon } from '@hugeicons/react';
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
import type { PointerEvent } from 'react';

import { cn } from '@repo/ui/cn';
import {
  MorphContextMenu,
  MorphContextMenuContent,
  MorphContextMenuItem,
  MorphContextMenuTrigger,
} from '@repo/ui/morph-context-menu';

import {
  CollectionPocket,
  POCKET_SIZE,
  pocketPreviewSlot,
} from '#/components/collection-card-pocket';
import { CollectionColorDialog } from '#/components/collection-context-menu/collection-color-dialog';
import { CollectionRenameDialog } from '#/components/collection-context-menu/collection-rename-dialog';
import type { CollectionColor } from '#/features/collections/collection-types';
import type { LandingSortFolder } from '#/features/landing/landing.type';
import { findLandingTile } from '#/features/landing/landing-content';
import type {
  LandingAllTypesCardProps,
  LandingAllTypesItem,
  LandingDemoPanelProps,
  LandingDemoProps,
  LandingDropCardProps,
  LandingLocalFolderProps,
  LandingLocalTile,
  LandingLocalTileProps,
  LandingSortCard,
  LandingSortCardProps,
  LandingSortFolderProps,
  LandingTypeBadgeProps,
} from '#/features/landing/landing-demo.type';
import {
  demoSlice,
  phaseProgress,
  rotatePoint,
} from '#/features/landing/landing-motion';

import {
  LAPTOP,
  Laptop,
  LAPTOP_FACE_CAMERA,
  LAPTOP_FACE_CAMERA_TURNS,
} from './landing-laptop';
import { TileMedia } from './landing-ui';

const LIFT = { y: -8, scale: 1.02 };
// Room past the box on the uncut sides, so a turned card's corners aren't cut.
const CLIP_ROOM = '-8px';
const LIFT_SPRING = { type: 'spring', duration: 0.35, bounce: 0.15 } as const;

/** Four kinds of saves drop into one library, one after another, as the step scrolls. */
export function DemoAllTypes({ progress }: LandingDemoProps) {
  return (
    <DemoPanel>
      {/* Two columns like the library, so every card keeps its own aspect ratio. */}
      <div className="flex shrink-0 gap-4 max-md:scale-[0.7]">
        {ALL_TYPE_COLUMNS.map((column, columnIndex) => (
          <div key={columnIndex} className="flex w-56 flex-col gap-4">
            {column.map(({ item, index }) => (
              <DropCard key={index} index={index} progress={progress}>
                <AllTypesCard item={item} />
              </DropCard>
            ))}
          </div>
        ))}
      </div>
    </DemoPanel>
  );
}

// Image, website and the second video go in the first column, video and note in the second: each save joins the shorter column, as in the library.
// The second video is 4:3, so both columns end near the same line and the group reads as a square.
const ALL_TYPES: LandingAllTypesItem[] = [
  { label: 'Image', icon: Image01Icon, tileId: 'neuro-pop' },
  { label: 'Video', icon: Video01Icon, tileId: 'heist-button' },
  { label: 'Website', icon: Link01Icon, tileId: 'house-of-honey' },
  { label: 'Note', icon: Note01Icon },
  { label: 'Video', icon: Video01Icon, tileId: 'patch' },
];

const ALL_TYPE_COLUMNS = [0, 1].map((column) =>
  ALL_TYPES.map((item, index) => ({ item, index })).filter(
    ({ index }) => index % 2 === column,
  ),
);

/** Loose saves fly into their folders as the step scrolls, and each count goes up when one lands. */
export function DemoSort({ progress }: LandingDemoProps) {
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
              isLanded={index < landed}
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
/** The pocket sits centered in the folder card's top part (the card minus its 56px label row), inside a 1px border. */
const SORT_POCKET_TOP =
  SORT_FOLDER_TOP + 1 + (SORT_FOLDER_SIZE - 2 - 56 - POCKET_SIZE.height) / 2;
const SORT_FRONT_TOP =
  SORT_POCKET_TOP + POCKET_SIZE.height - POCKET_SIZE.frontHeight;
// A card flies over the pocket in this share of its slice, then drops in for the rest.
const SORT_OVER_SHARE = 0.65;
const SORT_OVER_GAP = 6;

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

// Each card ends on the exact spot the folder gives its new preview, so the hand-off doesn't show.
const SORT_CARDS: LandingSortCard[] = [
  { tileId: 'cleo-y-teo', folder: 'Brand' },
  { tileId: 'nothin', folder: 'Web Design' },
  { tileId: 'petrichor', folder: 'Brand' },
  { tileId: 'era', folder: 'Web Design' },
].map((card, index, cards) => {
  const left =
    (SORT_WIDTH - 4 * SORT_CARD.width - 3 * SORT_CARD.gap) / 2 +
    index * (SORT_CARD.width + SORT_CARD.gap);
  const folder = SORT_FOLDERS.find((item) => item.name === card.folder)!;
  const count =
    folder.previewTileIds.length +
    cards.slice(0, index + 1).filter((item) => item.folder === card.folder)
      .length;
  const slot = pocketPreviewSlot(
    findLandingTile(card.tileId),
    count - 1,
    count,
  );

  return {
    ...card,
    left,
    target: {
      left: folder.left + SORT_FOLDER_SIZE / 2 + slot.x - slot.width / 2,
      top: SORT_POCKET_TOP + slot.top,
      width: slot.width,
      height: slot.height,
      rotate: slot.rotate,
    },
  };
});

/** A closed laptop opens as the step scrolls. The library lifts out of its screen and lands in a folder: your files, on your computer. */
export function DemoLocal({ progress }: LandingDemoProps) {
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
      <div className="flex shrink-0 scale-[0.88] flex-col items-center max-md:scale-[0.5]">
        <motion.div
          style={{ x: panX }}
          whileHover={{ ...LIFT, transition: LIFT_SPRING }}
        >
          <Laptop lidAngle={lidAngle}>
            {LOCAL_TILES.map((tile, index) => (
              <LocalTile
                key={tile.id}
                tile={tile}
                progress={progress}
                isStill={prefersReducedMotion}
                isLanded={index < landed}
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
/** The folder's pocket center, in the lid's frame: left of the screen, halfway down. */
const LOCAL_FOLDER = { x: -160, y: 160, width: 128 };
// The folder shows this many saves; later ones drop all the way into the pocket.
const LOCAL_FOLDER_PREVIEWS = 3;
const LOCAL_FRONT_TOP = POCKET_SIZE.height / 2 - POCKET_SIZE.frontHeight;
// A tile flies over the pocket in this share of its slice, then drops in for the rest.
const LOCAL_OVER_SHARE = 0.65;
const LOCAL_OVER_GAP = 6;
const LOCAL_LIFT = 80;

// Each tile starts on its slot in the screen's grid and ends on the spot the folder gives its preview,
// in the pocket's frame (from its center, before the folder turns to face you).
const LOCAL_TILES = LOCAL_TILE_IDS.map((id, index): LandingLocalTile => {
  const left =
    LAPTOP.bezel +
    LOCAL_SCREEN_PAD +
    (index % 3) * (LOCAL_TILE_WIDTH + LOCAL_TILE_GAP);
  const top =
    LAPTOP.bezel +
    LOCAL_SCREEN_PAD +
    Math.floor(index / 3) * (LOCAL_TILE_HEIGHT + LOCAL_TILE_GAP);
  const start = LOCAL_FLY.start + index * LOCAL_FLY.gap;
  const isShown = index < LOCAL_FOLDER_PREVIEWS;
  // A folder shows up to three previews, so later tiles aim at the last spot and then sink past it.
  const shown = Math.min(index + 1, LOCAL_FOLDER_PREVIEWS);
  const slot = pocketPreviewSlot(findLandingTile(id), shown - 1, shown);
  const rotate = isShown ? slot.rotate : 0;
  const rad = (rotate * Math.PI) / 180;
  // The preview turns around its bottom center, so its center moves a little with the turn.
  const bottom = -POCKET_SIZE.height / 2 + slot.top + slot.height;
  const restY = isShown
    ? bottom - (Math.cos(rad) * slot.height) / 2
    : LOCAL_FRONT_TOP + 2 + slot.height / 2;

  return {
    id,
    left,
    top,
    slice: [start, start + LOCAL_FLY.length],
    width: slot.width,
    height: slot.height,
    rotate,
    x: isShown ? slot.x + (Math.sin(rad) * slot.height) / 2 : 0,
    overY: LOCAL_FRONT_TOP - LOCAL_OVER_GAP - slot.height / 2,
    restY,
  };
});

// *** DemoPanel ***
/** The panel tilts toward the mouse and catches a soft light, so the demo feels like an object you can turn. */
function DemoPanel({ children }: LandingDemoPanelProps) {
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
function DropCard({ index, progress, children }: LandingDropCardProps) {
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
function AllTypesCard({ item }: LandingAllTypesCardProps) {
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
/** Flies over its folder, shrinks to the preview's size, then drops into the pocket behind the front. */
function SortCard({ card, index, progress, isLanded }: LandingSortCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [start, end] = demoSlice(index);
  const over = start + (end - start) * SORT_OVER_SHARE;
  const { target } = card;
  const overTop = SORT_FRONT_TOP - SORT_OVER_GAP - target.height;
  const left = useTransform(progress, [start, over], [card.left, target.left]);
  const top = useTransform(
    progress,
    [start, over, end],
    [0, overTop, target.top],
  );
  const width = useTransform(
    progress,
    [start, over],
    [SORT_CARD.width, target.width],
  );
  const height = useTransform(
    progress,
    [start, over],
    [SORT_CARD.height, target.height],
  );
  const rotate = useTransform(progress, [start, over], [0, target.rotate]);
  // The part below the pocket's front edge is cut off, so the card goes in behind it.
  const clipPath = useTransform(
    () =>
      `inset(${CLIP_ROOM} ${CLIP_ROOM} ${Math.max(0, top.get() + height.get() - SORT_FRONT_TOP)}px ${CLIP_ROOM})`,
  );

  return (
    // The outer box cuts and the inner card turns, so the cut stays level with the folder's front.
    <motion.div
      style={
        prefersReducedMotion
          ? { left: card.left, top: 0 }
          : { left, top, width, height, clipPath }
      }
      // The folder's own preview takes over once the card lands. The card never catches the right-click or the hover.
      className={cn(
        'pointer-events-none absolute z-10 h-32 w-24',
        isLanded && 'invisible',
      )}
    >
      <motion.div
        style={prefersReducedMotion ? {} : { rotate, originY: 1 }}
        className="size-full overflow-hidden rounded-sm border bg-muted outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
      >
        <TileMedia
          tile={findLandingTile(card.tileId)}
          className="rounded-none"
        />
      </motion.div>
    </motion.div>
  );
}

// *** SortFolder ***
/** The library's own folder card. Right-click opens the same rename and color dialogs, kept in this demo only. */
function SortFolder({ folder, landedTileIds }: LandingSortFolderProps) {
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
                  folderPreview,
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
/** A save on the laptop's screen. It lifts off, turns to face you, and drops into the folder's pocket. */
function LocalTile({
  tile,
  progress,
  isStill,
  isLanded,
}: LandingLocalTileProps) {
  const pose = useTransform(progress, (value) => localTilePose(tile, value));
  const poseTransform = useTransform(pose, (value) => value.transform);
  const width = useTransform(pose, (value) => value.width);
  const height = useTransform(pose, (value) => value.height);
  const clipPath = useTransform(pose, (value) => value.clipPath);
  const rotate = useTransform(pose, (value) => value.rotate);
  // Reduced motion keeps the tile still, so it fades instead of flying.
  const [start, end] = tile.slice;
  const opacity = useTransform(
    progress,
    transform([start + (end - start) * 0.8, end], [1, 0]),
  );

  return (
    <motion.div
      style={{
        left: tile.left,
        top: tile.top,
        ...(isStill
          ? { width: LOCAL_TILE_WIDTH, height: LOCAL_TILE_HEIGHT, opacity }
          : { width, height, transform: poseTransform, clipPath }),
      }}
      // The folder's own preview takes over once the tile lands.
      className={cn(
        'absolute [backface-visibility:hidden]',
        isLanded && 'invisible',
      )}
    >
      {/* The outer box cuts and the inner tile turns, so the cut stays level with the folder's front. */}
      <motion.div
        style={isStill ? {} : { rotate }}
        className="size-full overflow-hidden rounded-sm"
      >
        <TileMedia tile={findLandingTile(tile.id)} className="rounded-sm" />
      </motion.div>
    </motion.div>
  );
}

// *** localTilePose ***
/**
 * Over the pocket first, turning to face you and shrinking to the preview's size, then straight down into it.
 * The pocket's spot is turned like the folder (`LAPTOP_FACE_CAMERA_TURNS`), so the tile lands exactly on the preview.
 */
function localTilePose(tile: LandingLocalTile, progress: number) {
  const [start, end] = tile.slice;
  const over = start + (end - start) * LOCAL_OVER_SHARE;
  const fly = phaseProgress(progress, start, over);
  const drop = phaseProgress(progress, over, end);
  const width = mix(LOCAL_TILE_WIDTH, tile.width, fly);
  const height = mix(LOCAL_TILE_HEIGHT, tile.height, fly);
  const localY = mix(tile.overY, tile.restY, drop);
  // One pixel in front of the folder, so the two flat faces don't flicker.
  const turned = rotatePoint(
    { x: tile.x, y: localY, z: 1 },
    LAPTOP_FACE_CAMERA_TURNS,
  );
  // Starts one pixel in front of the screen for the same reason, and arcs up so it clears the screen's edge.
  const center = {
    x: mix(tile.left + LOCAL_TILE_WIDTH / 2, LOCAL_FOLDER.x + turned.x, fly),
    y: mix(tile.top + LOCAL_TILE_HEIGHT / 2, LOCAL_FOLDER.y + turned.y, fly),
    z: mix(1, turned.z, fly) + Math.sin(Math.PI * fly) * LOCAL_LIFT,
  };
  const turns = LAPTOP_FACE_CAMERA_TURNS.map(
    (turn) => `rotate${turn.axis.toUpperCase()}(${turn.deg * fly}deg)`,
  ).join(' ');
  const cut = drop > 0 ? Math.max(0, localY + height / 2 - LOCAL_FRONT_TOP) : 0;

  return {
    width,
    height,
    transform: `translate3d(${center.x - tile.left - width / 2}px, ${center.y - tile.top - height / 2}px, ${center.z}px) ${turns}`,
    rotate: tile.rotate * fly,
    clipPath: `inset(${CLIP_ROOM} ${CLIP_ROOM} ${cut}px ${CLIP_ROOM})`,
  };
}

// *** mix ***
function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

// *** LocalFolder ***
/** The library's folder, standing beside the laptop and turned to face you. It shows the first saves that land. */
function LocalFolder({ progress, landed }: LandingLocalFolderProps) {
  const opacity = useTransform(
    progress,
    transform([LOCAL_FLY.start - 0.02, LOCAL_FLY.start + 0.04], [0, 1]),
  );

  return (
    <motion.div
      style={{
        left: LOCAL_FOLDER.x - LOCAL_FOLDER.width / 2,
        top: LOCAL_FOLDER.y - POCKET_SIZE.height / 2,
        width: LOCAL_FOLDER.width,
        opacity,
        transform: LAPTOP_FACE_CAMERA,
        // Turns around the pocket's center, the point the tiles aim at.
        transformOrigin: `50% ${POCKET_SIZE.height / 2}px`,
      }}
      className="group absolute flex flex-col items-center"
    >
      <CollectionPocket
        color="orange"
        previews={LOCAL_TILES.slice(
          0,
          Math.min(landed, LOCAL_FOLDER_PREVIEWS),
        ).map(({ id }) => folderPreview(id))}
      />
      <p className="mt-3 t-l-2">mado-export</p>
      <p className="t-b-3 text-muted-fg tabular-nums">
        {landed} {landed === 1 ? 'save' : 'saves'}
      </p>
    </motion.div>
  );
}

// *** folderPreview ***
function folderPreview(id: string) {
  const tile = findLandingTile(id);
  return {
    id,
    width: tile.width,
    height: tile.height,
    media: <TileMedia tile={tile} loading="eager" className="rounded-none" />,
  };
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
function TypeBadge({ icon, label }: LandingTypeBadgeProps) {
  return (
    <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-bg/90 px-2.5 py-1 t-l-3 text-fg shadow-sm">
      <HugeiconsIcon icon={icon} size={14} strokeWidth={1.5} />
      {label}
    </span>
  );
}
