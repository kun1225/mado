export type LandingGalleryItem =
  | {
      kind: 'image';
      id: string;
      src: string;
      width: number;
      height: number;
      name: string;
    }
  | { kind: 'text'; id: string; text: string; name: string }
  | { kind: 'site'; id: string; specimen: string; name: string };

export type LandingTodayArt = 'device' | 'open' | 'sort';

export type LandingTodayItem = {
  title: string;
  line: string;
  art: LandingTodayArt;
};

export type LandingStep = {
  title: string;
  status: 'Works today' | 'Coming';
};

export type LandingRoadmapItem = {
  phase: string;
  name: string;
  line: string;
  isLive: boolean;
};
