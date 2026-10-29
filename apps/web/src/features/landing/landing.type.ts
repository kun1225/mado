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

export type LandingRoadmapItem = {
  phase: string;
  name: string;
  line: string;
  isLive: boolean;
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
