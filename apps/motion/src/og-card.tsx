import { loadFont as loadCormorant } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import type { OgCardTile } from './og-card.type';

const { fontFamily: GEIST } = loadGeist('normal', {
  weights: ['400', '600'],
  subsets: ['latin'],
});
const { fontFamily: CORMORANT } = loadCormorant('italic', {
  weights: ['600'],
  subsets: ['latin'],
});

/**
 * The link preview for mado-design.com: the landing title with saved sources floating around it.
 * Every move is a full sine cycle over the clip, so the video loops with no jump and frame 0 works as the still.
 */
export function OgCard() {
  return (
    <AbsoluteFill
      className="bg-bg text-fg"
      style={{ fontFamily: GEIST, overflow: 'hidden' }}
    >
      {OG_TILES.map((tile) => (
        <FloatingTile key={tile.id} tile={tile} />
      ))}
      <Title />
    </AbsoluteFill>
  );
}

// *** FloatingTile ***
function FloatingTile({ tile }: { tile: OgCardTile }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const angle = (frame / durationInFrames) * Math.PI * 2 + tile.phase;

  return (
    <Img
      src={staticFile(`landing/${tile.id}.webp`)}
      style={{
        position: 'absolute',
        left: tile.x,
        top: tile.y,
        width: tile.width,
        borderRadius: 12,
        boxShadow: '0 1px 2px rgb(0 0 0 / 0.06), 0 12px 32px rgb(0 0 0 / 0.08)',
        transform: `translate(${Math.cos(angle) * 4}px, ${Math.sin(angle) * 10}px) rotate(${tile.tilt}deg)`,
      }}
    />
  );
}

// *** Title ***
function Title() {
  return (
    <AbsoluteFill className="items-center justify-center">
      {/* Keeps the title readable over the tiles, the same way the landing hero does. */}
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 460,
          background:
            'radial-gradient(closest-side, var(--color-bg) 60%, transparent)',
        }}
      />
      <div className="relative flex flex-col items-center text-center">
        <p className="text-muted-fg" style={{ fontSize: 24, fontWeight: 600 }}>
          Mado
        </p>
        <h1
          style={{
            marginTop: 12,
            fontSize: 68,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          Your{' '}
          <em
            style={{
              fontFamily: CORMORANT,
              fontWeight: 600,
              fontSize: 80,
              letterSpacing: '-0.01em',
            }}
          >
            local
          </em>{' '}
          design library.
        </h1>
        <p className="text-muted-fg" style={{ marginTop: 20, fontSize: 26 }}>
          Free, on your device. No sign-up.
        </p>
      </div>
    </AbsoluteFill>
  );
}

// The tiles sit at the edges, so the middle stays clear for the title.
const OG_TILES: OgCardTile[] = [
  { id: 'neuro-pop', x: 40, y: 36, width: 220, tilt: -3, phase: 0 },
  { id: 'petrichor', x: -30, y: 232, width: 170, tilt: 2, phase: 1.3 },
  { id: 'house-of-honey', x: 170, y: 452, width: 230, tilt: -2, phase: 2.6 },
  { id: 'typography', x: 470, y: -40, width: 260, tilt: 1, phase: 3.9 },
  { id: 'supahero', x: 950, y: 30, width: 190, tilt: 3, phase: 0.7 },
  { id: 'cleo-y-teo', x: 990, y: 270, width: 230, tilt: -2, phase: 2 },
  { id: 'thiings', x: 790, y: 470, width: 220, tilt: 2, phase: 3.3 },
  { id: 'sour-turn', x: 530, y: 560, width: 140, tilt: -1, phase: 4.6 },
];
