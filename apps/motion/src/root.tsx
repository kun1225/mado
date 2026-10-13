import { Composition } from 'remotion';

import { MotionPost } from './motion-post';

import './styles.css';

const FPS = 30;
const DURATION_IN_FRAMES = 150;

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
    </>
  );
}
