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

export type LandingRoadmapItem = {
  phase: string;
  name: string;
  line: string;
  isLive: boolean;
};

export type LandingSeedCollection = 'Typography' | 'Pattern' | 'Brand';

export type LandingSeedSource = {
  collection: LandingSeedCollection;
  name: string;
  /** A thumbnail on a host that allows cross-origin fetch, so the browser can save it. */
  src: string;
  /** The public page the image comes from, shown as the source's link. */
  url: string;
};
