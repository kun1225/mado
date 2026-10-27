import type {
  LandingGalleryItem,
  LandingRoadmapItem,
  LandingStep,
  LandingTodayItem,
} from './landing.type';

export const LANDING_APP_HREF = '/library';

// Open-licensed photos from the brand moodboard; credited in the footer.
// TODO(launch): swap for screenshots of a real Mado library, hosted with the app.
const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=720`;

export const LANDING_GALLERY: LandingGalleryItem[] = [
  {
    kind: 'image',
    id: 'bregenz',
    src: commons('Bregenz_kunsthaus_zumthor_2002_02.jpg'),
    width: 3,
    height: 4,
    name: 'Kunsthaus Bregenz',
  },
  {
    kind: 'text',
    id: 'brief',
    text: 'Calm, exact, a little human. Not luxury. Not cold.',
    name: 'brief.md',
  },
  {
    kind: 'image',
    id: 'kanazawa',
    src: commons('21st_Century_Museum_260123.jpg'),
    width: 4,
    height: 3,
    name: '21st Century Museum, Kanazawa',
  },
  {
    kind: 'image',
    id: 'glass-window',
    src: commons('Phillip_Johnson_Glass_House_Window.jpg'),
    width: 2,
    height: 3,
    name: 'Glass House window',
  },
  {
    kind: 'site',
    id: 'specimen',
    specimen: 'Aa Rr',
    name: 'Bodoni Moda specimen',
  },
  {
    kind: 'image',
    id: 'church',
    src: commons('Ibaraki_Kasugaoka_Church_20080914.jpg'),
    width: 3,
    height: 4,
    name: 'Church of the Light',
  },
  {
    kind: 'image',
    id: 'sculpture',
    src: commons('Sculpture-gallery-interior-philip-johnson-glass-house.jpg'),
    width: 1,
    height: 1,
    name: 'Glass House sculpture gallery',
  },
  {
    kind: 'image',
    id: 'louisiana',
    src: commons('Louisiana_Museum_of_Modern_Art_Cafeen.jpg'),
    width: 4,
    height: 3,
    name: 'Louisiana Museum café',
  },
];

export const LANDING_GALLERY_CREDITS =
  'Photos from Wikimedia Commons: Kunsthaus Bregenz (CC BY-SA 3.0), 21st Century Museum Kanazawa (CC0), Glass House window (CC BY 4.0), Glass House sculpture gallery (CC BY-SA 3.0), Church of the Light (CC BY 2.0), Louisiana Museum café (CC BY-SA 4.0).';

export const LANDING_TODAY: LandingTodayItem[] = [
  {
    title: 'Stays on your device',
    line: 'Your files live in this browser. Nothing is uploaded, so your references stay yours.',
    art: 'device',
  },
  {
    title: 'No sign-up',
    line: 'Open it and start. An account is optional, and only for later.',
    art: 'open',
  },
  {
    title: 'Drop and sort',
    line: 'Drag in images, videos, sites and notes. Sort them into collections and folders.',
    art: 'sort',
  },
];

export const LANDING_STEPS: LandingStep[] = [
  { title: 'Collect', status: 'Works today' },
  { title: 'Make sense', status: 'Coming' },
  { title: 'Shape directions', status: 'Coming' },
  { title: 'Present', status: 'Coming' },
];

export const LANDING_ROADMAP: LandingRoadmapItem[] = [
  {
    phase: 'Now',
    name: 'The library',
    line: 'Save images, videos, sites and notes. Sort them into collections.',
    isLive: true,
  },
  {
    phase: '01',
    name: 'Facets',
    line: 'Tag sources by emotion, style, color, type and industry. Pull a palette from any image.',
    isLive: false,
  },
  {
    phase: '02',
    name: 'Projects and canvas',
    line: 'A project per client with a brief, picked sources and an infinite canvas.',
    isLive: false,
  },
  {
    phase: '03',
    name: 'AI that shows its sources',
    line: 'Two or three brand directions, each linked to the sources behind it. Opt-in.',
    isLive: false,
  },
  {
    phase: '04',
    name: 'Present and share',
    line: 'Frames become slides. Clients comment and pick a direction, no account needed.',
    isLive: false,
  },
];
