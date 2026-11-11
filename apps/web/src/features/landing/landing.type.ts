import type { MotionValue } from 'motion/react';
import type { CSSProperties, ReactNode, RefObject } from 'react';

import type { CollectionColor } from '#/features/collections/collection-types';

export type LandingPainWordProps = {
  word: string;
  index: number;
  progress: MotionValue<number>;
};

export type LandingFeatureDemoProps = {
  demo: LandingFeatureDemo;
  index: number;
  stepsProgress: MotionValue<number>;
};

export type LandingFeatureStepProps = Pick<LandingFeature, 'title' | 'line'> & {
  index: number;
  isActive: boolean;
  progress: MotionValue<number>;
  onSelect: () => void;
};

export type LandingTile = {
  id: string;
  name: string;
  collection: string;
  kind: 'image' | 'video';
  src: string;
  width: number;
  height: number;
};

/** Where a hero tile floats, as a fraction of the stage, before it moves into the library grid. */
export type LandingFloat = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export type LandingRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LandingTilePose = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export type LandingFeatureDemo = 'all-types' | 'sort' | 'local';

export type LandingFeature = {
  title: string;
  line: string;
  demo: LandingFeatureDemo;
};

/** A folder in the sort demo. `saves` counts the saves already in it before any card lands. */
export type LandingSortFolder = {
  name: string;
  color: CollectionColor | null;
  left: number;
  saves: number;
  previewTileIds: string[];
};

export type LandingSearchQuery = {
  text: string;
  mode: 'Name' | 'Collection' | 'Describe';
  isSoon: boolean;
  tileIds: string[];
};

export type LandingFaqItem = {
  question: string;
  answer: string;
};

export type LandingNavItem = {
  id: string;
  label: string;
};

/** A section's top and bottom edges, in viewport pixels. */
export type LandingSectionBounds = {
  id: string;
  top: number;
  bottom: number;
};

export type LandingHeaderProps = {
  heroRef: RefObject<HTMLElement | null>;
};

export type LandingHeaderNavLinkProps = {
  item: LandingNavItem;
  isActive: boolean;
};

export type LandingHeroProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

export type LandingPointer = {
  x: MotionValue<number>;
  y: MotionValue<number>;
};

export type LandingSlotLayout = {
  stage: { width: number; height: number };
  slots: Map<string, LandingRect>;
};

export type LandingLibraryFrameProps = {
  progress: MotionValue<number>;
  spread: MotionValue<number>;
  pointer: LandingPointer;
  chromeOpacity: MotionValue<number>;
};

export type LandingHeroTileProps = Pick<
  LandingLibraryFrameProps,
  'progress' | 'spread' | 'pointer'
> & {
  tile: LandingTile;
  float: LandingFloat;
  index: number;
  layout: LandingSlotLayout | null;
};

export type LandingHeroCopyProps = {
  isVeiled: boolean;
};

export type LandingQueryBarProps = {
  index: number;
  progress: MotionValue<number>;
};

export type LandingFooterWindowProps = {
  clipPath: MotionValue<string>;
  clusterScale: MotionValue<number>;
};

export type LandingFooterWordmarkProps = {
  opacity: MotionValue<number>;
  maX: MotionValue<string>;
  doX: MotionValue<string>;
};

export type LandingHeroBobStyle = CSSProperties & {
  '--bob': MotionValue<string>;
};

export type LandingTileMediaProps = {
  tile: LandingTile;
  loading?: 'lazy' | 'eager';
  className?: string;
};

export type LandingChildrenProps = {
  children: ReactNode;
};

export type LandingClassNameProps = {
  className?: string;
};

export type LandingDownloadMadoProps = LandingClassNameProps & {
  label?: string;
};
