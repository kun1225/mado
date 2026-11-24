import { Composition } from 'remotion';

import { MotionPost } from './motion-post';
import { OgCard } from './og-card';

import './styles.css';

const FPS = 30;
const DURATION_IN_FRAMES = 150;
const OG_DURATION_IN_FRAMES = 180;

const SIZES = [
  { id: '4x5', width: 1080, height: 1350 },
  { id: '9x16', width: 1080, height: 1920 },
];

export function RemotionRoot() {
  return (
    <>
      {SIZES.map((size) => (
        <Composition
          key={size.id}
          id={`MotionPost-${size.id}`}
          component={MotionPost}
          fps={FPS}
          durationInFrames={DURATION_IN_FRAMES}
          width={size.width}
          height={size.height}
        />
      ))}
      {/* 1200×630 is the size Facebook, LinkedIn, Slack and X crop link previews to. */}
      <Composition
        id="OgCard"
        component={OgCard}
        fps={FPS}
        durationInFrames={OG_DURATION_IN_FRAMES}
        width={1200}
        height={630}
      />
    </>
  );
}
