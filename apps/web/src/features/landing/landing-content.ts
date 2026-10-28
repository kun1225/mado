import type {
  LandingFaqItem,
  LandingFeature,
  LandingRoadmapItem,
  LandingSearchQuery,
  LandingTile,
} from './landing.type';

export const LANDING_APP_HREF = '/library';

export const LANDING_TILES: LandingTile[] = [
  tile('neuro-pop', 'NEURO POP moodboard', 'Brand', 720, 498),
  tile('pattern', 'Gradient pattern', 'Patterns', 720, 846),
  tile('house-of-honey', 'House of Honey', 'Web Design', 720, 378),
  tile('heist-button', 'Heist button', 'Button', 640, 774, 'video'),
  tile('thiings', 'Thiings 3D icons', 'Design Curated', 720, 406),
  tile('cleo-y-teo', 'Cleo y Teo', 'Brand', 720, 468),
  tile('typography', 'Cartier type specimen', 'Typography', 720, 272),
  tile('supahero', 'Supahero hero library', 'Design Curated', 720, 728),
  tile('nothin', "Nothin' home", 'Web Design', 720, 378),
  tile('sotd', 'Explore new worlds', 'Unsorted', 640, 480, 'video'),
  tile('petrichor', 'Petrichor sign', 'Brand', 720, 956),
  tile('cole-derochie', 'Cole Derochie', 'Web Design', 720, 378),
  tile(
    'microinteraction',
    'Card microinteraction',
    'Microinteraction',
    640,
    360,
    'video',
  ),
  tile('logosystem', 'Logosystem', 'Design Curated', 720, 406),
  tile('melike', 'me · like carousel', 'Carousel', 720, 378),
  tile('doodle-type', 'Doodles with type', 'Unsorted', 640, 800, 'video'),
  tile('posts-design', 'posts.design', 'Design Curated', 720, 640),
  tile('era', 'Era illustrator', 'Web Design', 720, 406),
  tile('sour-turn', 'Sour turn 404', '404', 720, 648),
  tile('catalog', 'Catalog studio', 'Web Design', 720, 378),
];

export const LANDING_COLLECTIONS = [
  {
    name: 'Brand',
    saves: 5,
    previews: ['cleo-y-teo', 'neuro-pop', 'petrichor'],
  },
  { name: 'Web Design', saves: 38, previews: ['nothin', 'era', 'catalog'] },
  {
    name: 'Design Curated',
    saves: 14,
    previews: ['thiings', 'supahero', 'logosystem'],
  },
  { name: 'Typography', saves: 1, previews: ['typography'] },
  { name: 'Patterns', saves: 2, previews: ['pattern'] },
];

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: 'Every file in one place',
    line: 'Images, videos, websites and notes. Drop, paste or drag them in.',
    demo: 'all-types',
  },
  {
    title: 'Sort the way you think',
    line: 'Collections, and folders inside them. Drag a card to move it.',
    demo: 'sort',
  },
  {
    title: 'Yours, on your computer',
    line: 'Nothing leaves your device. Export it all as a zip, and import it back anytime.',
    demo: 'local',
  },
];

export const LANDING_SEARCH_TILE_IDS = [
  'typography',
  'cleo-y-teo',
  'pattern',
  'neuro-pop',
  'nothin',
  'doodle-type',
  'petrichor',
  'melike',
  'supahero',
  'thiings',
  'sotd',
  'house-of-honey',
];

export const LANDING_SEARCH_QUERIES: LandingSearchQuery[] = [
  {
    text: 'type',
    mode: 'Name',
    isSoon: false,
    tileIds: ['typography', 'doodle-type'],
  },
  {
    text: 'Brand',
    mode: 'Collection',
    isSoon: false,
    tileIds: ['cleo-y-teo', 'neuro-pop', 'petrichor'],
  },
  {
    text: 'bold, playful color',
    mode: 'Describe',
    isSoon: true,
    tileIds: ['neuro-pop', 'melike', 'thiings', 'sotd'],
  },
];

export const LANDING_FAQ: LandingFaqItem[] = [
  {
    question: 'Is Mado free?',
    answer:
      'Yes. The library is free and stays free. Later, cloud and AI extras may be paid, because they cost us money each time you use them.',
  },
  {
    question: 'Where are my files?',
    answer:
      'In your browser, on your device. Nothing is uploaded, so we never see them.',
  },
  {
    question: 'Can I use it on more than one device?',
    answer:
      'Not yet. Cloud backup and sync are coming. For now, export your library on one device and import it on the other.',
  },
  {
    question: 'What can I save?',
    answer: 'Images, videos, websites and notes. Fonts and PDFs come later.',
  },
  {
    question: 'What happens if I clear my browser data?',
    answer:
      'Your library is deleted with it. Export a backup from time to time, so you can import it again.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. An account is optional, and only needed for cloud features later.',
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
    name: 'Cloud backup',
    line: 'Back up your library and use it on more than one device.',
    isLive: false,
  },
  {
    phase: '04',
    name: 'Search by feeling',
    line: 'Describe what you remember, like "calm, warm, handmade", and find it.',
    isLive: false,
  },
  {
    phase: '05',
    name: 'AI that shows its sources',
    line: 'Two or three brand directions, each linked to the sources behind it. Opt-in.',
    isLive: false,
  },
];

export function findLandingTile(id: string) {
  const found = LANDING_TILES.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown landing tile: ${id}`);
  return found;
}

// *** tile ***
function tile(
  id: string,
  name: string,
  collection: string,
  width: number,
  height: number,
  kind: LandingTile['kind'] = 'image',
): LandingTile {
  const extension = kind === 'video' ? 'mp4' : 'webp';
  return {
    id,
    name,
    collection,
    kind,
    src: `/landing/${id}.${extension}`,
    width,
    height,
  };
}
