import type { IconSvgElement } from '@hugeicons/react';
import type { MotionValue } from 'motion/react';
import type { ReactNode } from 'react';

import type { LandingSortFolder } from './landing.type';

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

export type LandingSortCard = {
  tileId: string;
  folder: string;
  left: number;
  dx: number;
};

export type LandingSortCardProps = LandingDemoProps & {
  card: LandingSortCard;
  index: number;
};

export type LandingSortFolderProps = {
  folder: LandingSortFolder;
  landedTileIds: string[];
};

export type LandingLocalTile = {
  id: string;
  left: number;
  top: number;
  dx: number;
  dy: number;
  slice: [number, number];
};

export type LandingLocalTileProps = LandingDemoProps & {
  tile: LandingLocalTile;
  isStill: boolean | null;
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
