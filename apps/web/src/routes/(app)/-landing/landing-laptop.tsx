import { motion } from 'motion/react';

import { cn } from '@repo/ui/cn';

import type {
  LandingLaptopLidProps,
  LandingLaptopProps,
} from '#/features/landing/landing-demo.type';

import { Logo } from './landing-ui';

/** Measures shared with the demo, so what flies out of the screen lands where the laptop's frame says. */
export const LAPTOP = {
  lidWidth: 440,
  lidHeight: 240,
  /** The dark frame around the screen. */
  bezel: 10,
  /** Degrees of `rotateX` on the lid: closed lies flat on the keyboard, open leans past upright. */
  closedAngle: -90,
  openAngle: 12,
  /** How the laptop is seen: from a little above, and turned to the right. */
  viewTilt: 20,
  viewTurn: 24,
} as const;

/**
 * Cancels the view and the open lid, so something inside the lid's frame faces the screen straight on.
 * Why: a flat folder next to a tilted laptop would look pasted on.
 */
export const LAPTOP_FACE_CAMERA = `rotateX(-${LAPTOP.openAngle}deg) rotateY(${LAPTOP.viewTurn}deg) rotateX(${LAPTOP.viewTilt}deg)`;

/**
 * A laptop with real depth: the lid leans back and the keyboard lies flat.
 * `lidAngle` opens it. `children` sit in the lid's frame, so they ride the lid and can fly out of the screen.
 */
export function Laptop({ lidAngle, children }: LandingLaptopProps) {
  return (
    <div className="relative [perspective:1800px]">
      <div
        style={{
          width: LAPTOP.lidWidth,
          height: LAPTOP.lidHeight + BASE_THICKNESS,
          // Turns around the middle of the laptop's depth, so it stays centered.
          transformOrigin: `50% 50% -${LAPTOP.lidHeight / 2}px`,
          transform: `rotateX(-${LAPTOP.viewTilt}deg) rotateY(-${LAPTOP.viewTurn}deg)`,
        }}
        className="relative transform-3d"
      >
        <Lid angle={lidAngle}>{children}</Lid>
        <Base />
      </div>

      {/* The ground shadow is flat, so it stays outside the 3D box. */}
      <div
        aria-hidden
        className="absolute inset-x-6 -bottom-6 h-10 rounded-full bg-black/25 blur-2xl"
      />
    </div>
  );
}

const LID_THICKNESS = 6;
const BASE_THICKNESS = 10;
const ALUMINUM = 'bg-linear-to-b from-[#ececee] to-[#cfcfd3]';
const ALUMINUM_SIDE = 'bg-linear-to-b from-[#d9d9dc] to-[#b8b8bd]';
const HIDE_BACK = '[backface-visibility:hidden]';

// *** Lid ***
function Lid({ angle, children }: LandingLaptopLidProps) {
  return (
    <motion.div
      style={{
        height: LAPTOP.lidHeight,
        // The hinge is at the back of the keyboard.
        z: -LAPTOP.lidHeight,
        rotateX: angle,
        originY: 1,
        // One pixel above the keyboard, so a closed lid doesn't flicker against it.
        bottom: BASE_THICKNESS + 1,
        transformStyle: 'preserve-3d',
      }}
      className="absolute inset-x-0"
    >
      {/* The screen, in a dark bezel with a camera dot. */}
      <div
        className={cn(
          'absolute inset-0 overflow-hidden rounded-t-2xl rounded-b-md bg-[#0d0d0f] shadow-lg',
          HIDE_BACK,
        )}
        style={{ padding: LAPTOP.bezel }}
      >
        <span
          aria-hidden
          className="absolute top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[#2b2b30]"
        />
        <div className="size-full overflow-hidden rounded-md bg-bg" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/15 via-transparent to-transparent"
        />
      </div>

      {/* The outside of the lid, which shows while it is closed. */}
      <div
        aria-hidden
        style={{ transform: `translateZ(-${LID_THICKNESS}px) rotateY(180deg)` }}
        className={cn(
          'absolute inset-0 grid place-items-center rounded-t-2xl rounded-b-md',
          ALUMINUM,
          HIDE_BACK,
        )}
      >
        <Logo className="size-6 text-black/20" />
      </div>

      {/* The right edge and the top edge, so the lid has thickness. */}
      <div
        aria-hidden
        style={{ width: LID_THICKNESS }}
        // Inset by the corner radii, or the flat edge pokes out past the rounded corners.
        className={cn(
          'absolute top-4 right-0 bottom-1.5 origin-right [transform:rotateY(-90deg)]',
          ALUMINUM_SIDE,
        )}
      />
      <div
        aria-hidden
        style={{ height: LID_THICKNESS }}
        className={cn(
          'absolute inset-x-4 top-0 origin-top [transform:rotateX(-90deg)]',
          ALUMINUM_SIDE,
        )}
      />

      {children}
    </motion.div>
  );
}

// *** Base ***
/** The keyboard deck lies flat, and a front lip and a side edge give it thickness. */
function Base() {
  return (
    <>
      <div
        style={{ height: LAPTOP.lidHeight, bottom: BASE_THICKNESS }}
        className={cn(
          'absolute inset-x-0 origin-bottom [transform:rotateX(90deg)]',
          'flex flex-col items-center rounded-b-2xl px-6 pt-5 pb-5',
          ALUMINUM,
        )}
      >
        <Keyboard />
        <div
          aria-hidden
          className="mt-auto h-20 w-36 rounded-md border border-black/10 bg-linear-to-b from-[#e2e2e5] to-[#d4d4d8]"
        />
      </div>

      <div
        aria-hidden
        style={{ height: BASE_THICKNESS }}
        className={cn(
          'absolute inset-x-0 bottom-0 rounded-b-2xl',
          ALUMINUM_SIDE,
        )}
      >
        {/* The notch where a thumb lifts the lid. */}
        <div className="mx-auto h-1 w-20 rounded-b-full bg-black/15" />
      </div>

      <div
        aria-hidden
        style={{ width: LAPTOP.lidHeight, height: BASE_THICKNESS }}
        className={cn(
          'absolute right-0 bottom-0 origin-right [transform:rotateY(-90deg)]',
          ALUMINUM_SIDE,
        )}
      />
    </>
  );
}

// *** Keyboard ***
function Keyboard() {
  return (
    <div
      aria-hidden
      className="grid w-full grid-cols-14 gap-[3px] rounded-md bg-[#1a1a1d] p-1.5"
    >
      {KEYS.map((key) => (
        <span key={key} className="h-[18px] rounded-[3px] bg-[#2d2d32]" />
      ))}
    </div>
  );
}

const KEYS = Array.from({ length: 14 * 5 }, (_, index) => index);
