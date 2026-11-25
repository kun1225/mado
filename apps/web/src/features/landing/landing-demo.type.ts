import type { IconSvgElement } from '@hugeicons/react';
import type { MotionValue } from 'motion/react';
import type { ReactNode } from 'react';

import type { LandingRect, LandingSortFolder } from './landing.type';

export type LandingDemoProps = {
  progress: MotionValue<number>;
};

export type LandingDemoPanelProps = {
  children: ReactNode;
};

export type LandingDropCardProps = LandingDemoProps & {
  index: number;
  children: ReactNode;
};

export type LandingAllTypesItem = {
  label: string;
  icon: IconSvgElement;
  tileId?: string;
};

export type LandingAllTypesCardProps = {
  item: LandingAllTypesItem;
};

/** A save in the sort demo. `target` is the folder preview's spot, where its flight ends. */
export type LandingSortCard = {
  tileId: string;
  folder: string;
  left: number;
  target: LandingRect & { rotate: number };
};

export type LandingSortCardProps = LandingDemoProps & {
  card: LandingSortCard;
  index: number;
  isLanded: boolean;
};

export type LandingSortFolderProps = {
  folder: LandingSortFolder;
  landedTileIds: string[];
};

/**
 * A save in the laptop demo. `left` and `top` are its slot on the screen. The rest is its preview in the folder:
 * size, turn, and center in the pocket's frame, from over the pocket (`overY`) down to where it rests (`restY`).
 */
export type LandingLocalTile = {
  id: string;
  left: number;
  top: number;
  slice: [number, number];
  width: number;
  height: number;
  rotate: number;
  x: number;
  overY: number;
  restY: number;
};

export type LandingLocalTileProps = LandingDemoProps & {
  tile: LandingLocalTile;
  isStill: boolean | null;
  isLanded: boolean;
};

export type LandingLocalFolderProps = LandingDemoProps & {
  landed: number;
};

export type LandingTypeBadgeProps = Pick<LandingAllTypesItem, 'icon' | 'label'>;

export type LandingLaptopProps = {
  lidAngle: MotionValue<number>;
  children?: ReactNode;
};

export type LandingLaptopLidProps = {
  angle: MotionValue<number>;
  children: ReactNode;
};
