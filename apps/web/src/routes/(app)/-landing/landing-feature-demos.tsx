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
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { findLandingTile } from '#/features/landing/landing-content';

import { TileMedia } from './landing-ui';

const EASE_OUT = [0.25, 1, 0.5, 1] as const;

/** Four kinds of saves drop into one library. Replays each time the step turns active, because the demo remounts. */
export function DemoAllTypes() {
  return (
    <DemoPanel>
      <div className="grid size-full max-w-[440px] grid-cols-2 grid-rows-2 gap-3">
        {ALL_TYPES.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.18 }}
            className="relative overflow-hidden rounded-md bg-bg shadow-sm"
          >
            {item.tileId ? (
              <TileMedia tile={findLandingTile(item.tileId)} />
            ) : (
              <p className="p-4 t-b-3 text-pretty">
                If there’s something you want to do, just do it. Do it
                awkwardly. Everyone starts as a beginner.
              </p>
            )}
            <TypeBadge icon={item.icon} label={item.label} />
          </motion.div>
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

/** Loose saves fly into their collections, and each count goes up when one lands. */
export function DemoSort() {
  const [counts, setCounts] = useState<Record<string, number>>({
    Brand: 2,
    'Web Design': 36,
  });

  function land(folder: string) {
    setCounts((current) => ({ ...current, [folder]: current[folder] + 1 }));
  }

  return (
    <DemoPanel>
      {/* Fixed size, so each card's path to its folder is known in pixels. */}
      <div className="relative h-[240px] w-[340px]">
        {SORT_CARDS.map((card, index) => (
          <motion.div
            key={card.tileId}
            style={{ left: card.left }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: card.dx, y: 150, scale: 0.5, opacity: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.76, 0, 0.24, 1],
              delay: 0.5 + index * 0.6,
            }}
            onAnimationComplete={() => land(card.folder)}
            className="absolute top-0 z-10 h-20 w-16 overflow-hidden rounded-md shadow-md"
          >
            <TileMedia tile={findLandingTile(card.tileId)} />
          </motion.div>
        ))}

        {SORT_FOLDERS.map((folder) => (
          <div
            key={folder.name}
            style={{ left: folder.left }}
            className="absolute top-[132px] flex w-[120px] flex-col items-center"
          >
            <div className="relative mt-2 h-16 w-20 rounded-md rounded-tl-none bg-border">
              <div className="absolute -top-2 left-0 h-2 w-8 rounded-t-md bg-border" />
            </div>
            <p className="mt-2 t-l-2">{folder.name}</p>
            <p className="t-b-4 text-muted-fg tabular-nums">
              {counts[folder.name]} saves
            </p>
          </div>
        ))}
      </div>
    </DemoPanel>
  );
}

// Folder centers are at 100px and 240px; a card is 64px wide, so it lands at center - 32.
const SORT_CARDS = [
  { tileId: 'cleo-y-teo', left: 18, dx: 50, folder: 'Brand' },
  { tileId: 'nothin', left: 98, dx: 110, folder: 'Web Design' },
  { tileId: 'petrichor', left: 178, dx: -110, folder: 'Brand' },
  { tileId: 'era', left: 258, dx: -50, folder: 'Web Design' },
];

const SORT_FOLDERS = [
  { name: 'Brand', left: 40 },
  { name: 'Web Design', left: 180 },
];

/** The library sits inside a computer. A zip goes out and comes back in, for export and import. */
export function DemoLocal() {
  return (
    <DemoPanel>
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-[260px] rounded-lg border border-border bg-bg p-2.5 shadow-sm">
            <div className="grid grid-cols-3 gap-1.5">
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
          </div>
          <div className="mx-auto h-2 w-[300px] rounded-b-lg bg-border" />

          <motion.div
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: [0, 150, 150, 0], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 4,
              times: [0, 0.35, 0.65, 1],
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 0.6,
            }}
            className="absolute top-1/2 left-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-fg px-3 py-1.5 t-l-3 whitespace-nowrap text-bg shadow-md"
          >
            <HugeiconsIcon icon={FileZipIcon} size={14} strokeWidth={1.5} />
            mado-export.zip
          </motion.div>
        </div>

        <p className="mt-6 flex items-center gap-2 t-b-3 text-muted-fg">
          <HugeiconsIcon icon={ComputerIcon} size={16} strokeWidth={1.5} />
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
function DemoPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-full items-center justify-center overflow-hidden rounded-xl bg-muted p-6">
      {children}
    </div>
  );
}

// *** TypeBadge ***
function TypeBadge({ icon, label }: { icon: IconSvgElement; label: string }) {
  return (
    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-bg/90 px-2 py-0.5 t-l-4 text-fg shadow-sm">
      <HugeiconsIcon icon={icon} size={12} strokeWidth={1.5} />
      {label}
    </span>
  );
}
