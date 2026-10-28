import type {
  LandingGalleryItem,
  LandingRoadmapItem,
  LandingSeedCollection,
  LandingSeedSource,
  LandingTodayItem,
} from './landing.type';

export const LANDING_APP_HREF = '/library';

// Open-licensed photos from the brand moodboard.
// TODO(launch): CC BY and CC BY-SA need credit on the page. Kunsthaus Bregenz (CC BY-SA 3.0), 21st Century Museum Kanazawa (CC0),
// Glass House window (CC BY 4.0), Glass House sculpture gallery (CC BY-SA 3.0), Church of the Light (CC BY 2.0), Louisiana Museum café (CC BY-SA 4.0).
// The direct upload host, because it allows cross-origin fetch, which seeding the "try it" library needs.
// `hashPath` is the first one and two hex digits of the file name's MD5. Wikimedia serves only fixed widths, like 960.
// TODO(launch): swap for screenshots of a real Mado library, hosted with the app.
const commons = (hashPath: string, file: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${hashPath}/${file}/960px-${file}`;

export const LANDING_GALLERY: LandingGalleryItem[] = [
  {
    kind: 'image',
    id: 'bregenz',
    src: commons('3/33', 'Bregenz_kunsthaus_zumthor_2002_02.jpg'),
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
    src: commons('9/9a', '21st_Century_Museum_260123.jpg'),
    width: 4,
    height: 3,
    name: '21st Century Museum, Kanazawa',
  },
  {
    kind: 'image',
    id: 'glass-window',
    src: commons('9/9e', 'Phillip_Johnson_Glass_House_Window.jpg'),
    width: 2,
    height: 3,
    name: 'Glass House window',
  },
  {
    kind: 'site',
    id: 'specimen',
    specimen: 'Aa Rr',
    name: 'Cormorant Garamond specimen',
  },
  {
    kind: 'image',
    id: 'church',
    src: commons('c/cd', 'Ibaraki_Kasugaoka_Church_20080914.jpg'),
    width: 3,
    height: 4,
    name: 'Church of the Light',
  },
  {
    kind: 'image',
    id: 'sculpture',
    src: commons(
      'd/da',
      'Sculpture-gallery-interior-philip-johnson-glass-house.jpg',
    ),
    width: 1,
    height: 1,
    name: 'Glass House sculpture gallery',
  },
  {
    kind: 'image',
    id: 'louisiana',
    src: commons('1/1a', 'Louisiana_Museum_of_Modern_Art_Cafeen.jpg'),
    width: 4,
    height: 3,
    name: 'Louisiana Museum café',
  },
];

export const LANDING_TODAY_LINE =
  'Mado is early, but the base is solid. These three work right now.';

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

// Created newest first, so this order shows as Typography, Pattern, Brand.
export const LANDING_SEED_COLLECTIONS: LandingSeedCollection[] = [
  'Brand',
  'Pattern',
  'Typography',
];

// Public domain images on Wikimedia Commons, so they need no credit.
const thumb = (path: string) =>
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}`;
const filePage = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${file}`;

export const LANDING_SEED_SOURCES: LandingSeedSource[] = [
  {
    collection: 'Typography',
    name: 'Bodoni, Manuale Tipografico (1818)',
    src: thumb('7/75/Manuale-Tipografico1.jpg/960px-Manuale-Tipografico1.jpg'),
    url: filePage('Manuale-Tipografico1.jpg'),
  },
  {
    collection: 'Typography',
    name: 'Caslon type specimen (1734)',
    src: thumb(
      '4/45/A_Specimen_by_William_Caslon.jpg/960px-A_Specimen_by_William_Caslon.jpg',
    ),
    url: filePage('A_Specimen_by_William_Caslon.jpg'),
  },
  {
    collection: 'Typography',
    name: 'Fournier, Manuel Typographique (1766)',
    src: thumb(
      '7/72/Fournier-Manuel-Typographique-Vol-2.jpg/960px-Fournier-Manuel-Typographique-Vol-2.jpg',
    ),
    url: filePage('Fournier-Manuel-Typographique-Vol-2.jpg'),
  },
  {
    collection: 'Pattern',
    name: 'Morris, Strawberry Thief (1883)',
    src: thumb(
      '2/2a/Morris_Strawberry_Thief_1883.jpg/960px-Morris_Strawberry_Thief_1883.jpg',
    ),
    url: filePage('Morris_Strawberry_Thief_1883.jpg'),
  },
  {
    collection: 'Pattern',
    name: 'Owen Jones, The Grammar of Ornament, plate 43',
    src: thumb(
      '1/15/Owen_Jones_-_Grammar_of_Ornament_-_1868_-_plate_043_-_300ppi.jpg/960px-Owen_Jones_-_Grammar_of_Ornament_-_1868_-_plate_043_-_300ppi.jpg',
    ),
    url: filePage(
      'Owen_Jones_-_Grammar_of_Ornament_-_1868_-_plate_043_-_300ppi.jpg',
    ),
  },
  {
    collection: 'Pattern',
    name: 'Ise katagami stencil',
    src: thumb(
      '1/1a/Ise_Katagami_%28%E4%BC%8A%E5%8B%A2%E5%9E%8B%E7%B4%99%29_3.png/960px-Ise_Katagami_%28%E4%BC%8A%E5%8B%A2%E5%9E%8B%E7%B4%99%29_3.png',
    ),
    url: filePage('Ise_Katagami_(%E4%BC%8A%E5%8B%A2%E5%9E%8B%E7%B4%99)_3.png'),
  },
  {
    collection: 'Brand',
    name: 'Michelin, Bibendum poster (1898)',
    src: thumb('8/88/Michelin_Poster_1898.jpg/960px-Michelin_Poster_1898.jpg'),
    url: filePage('Michelin_Poster_1898.jpg'),
  },
  {
    collection: 'Brand',
    name: 'Peter Behrens, AEG lamp poster (1907)',
    src: thumb(
      'f/f9/1907_Peter_Behrens_Plakat_AEG-Metallfadenlampe.jpg/960px-1907_Peter_Behrens_Plakat_AEG-Metallfadenlampe.jpg',
    ),
    url: filePage('1907_Peter_Behrens_Plakat_AEG-Metallfadenlampe.jpg'),
  },
  {
    collection: 'Brand',
    name: 'NASA worm on Artemis I (2020)',
    src: thumb(
      '6/6c/Artemis_I_-_NASA_Worm-ESA_Logo_%28KSC-20200920-PH-CSH01_0083%29.jpg/960px-Artemis_I_-_NASA_Worm-ESA_Logo_%28KSC-20200920-PH-CSH01_0083%29.jpg',
    ),
    url: filePage(
      'Artemis_I_-_NASA_Worm-ESA_Logo_(KSC-20200920-PH-CSH01_0083).jpg',
    ),
  },
];
