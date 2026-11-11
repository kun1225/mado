import { useEffect, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';

import { cn } from '@repo/ui/cn';

import type {
  LandingHeaderNavLinkProps,
  LandingHeaderProps,
} from '#/features/landing/landing.type';
import { LANDING_NAV } from '#/features/landing/landing-content';
import { pickActiveSection } from '#/features/landing/landing-motion';

import { DownloadMado } from './landing-download-mado';
import { Wordmark } from './landing-ui';

// Hidden until the intro brings it in; see landing-intro.ts.
const INTRO_HIDDEN = 'in-data-[landing-intro=pending]:opacity-0';

export function LandingHeader({ heroRef }: LandingHeaderProps) {
  const [isSolid, setIsSolid] = useState(false);
  const activeId = useActiveSection();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  });
  // At 1 the hero stops sticking and the library starts to slide under the header.
  useMotionValueEvent(scrollYProgress, 'change', (value) =>
    setIsSolid(value >= 1),
  );

  return (
    // The bar itself takes no clicks, so the page between the two blocks stays usable.
    <header
      data-landing-header
      className={cn(
        'pointer-events-none sticky top-0 z-header flex h-16 items-center justify-between gap-4 px-edge',
        INTRO_HIDDEN,
      )}
    >
      <div
        className={cn(
          'pointer-events-auto flex h-10 items-center gap-2 rounded-lg p-1 pl-4 backdrop-blur-md transition-[background-color] duration-200 ease-out',
          isSolid ? 'bg-bg/85' : 'bg-bg/70',
        )}
      >
        <Wordmark />
        <nav aria-label="Sections" className="ml-3 hidden items-center md:flex">
          {LANDING_NAV.map((item) => (
            <HeaderNavLink
              key={item.id}
              item={item}
              isActive={activeId === item.id}
            />
          ))}
        </nav>
      </div>
      <DownloadMado label="Download" className="pointer-events-auto" />
    </header>
  );
}

// *** useActiveSection ***
function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const sections = LANDING_NAV.flatMap(({ id }) => {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        return rect ? [{ id, top: rect.top, bottom: rect.bottom }] : [];
      });
      // 40% down the screen, so a section counts once it fills most of the view.
      setActiveId(pickActiveSection(sections, window.innerHeight * 0.4));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return activeId;
}

// *** HeaderNavLink ***
function HeaderNavLink({ item, isActive }: LandingHeaderNavLinkProps) {
  return (
    <a
      href={`#${item.id}`}
      aria-current={isActive ? 'location' : undefined}
      className={cn(
        'relative inline-flex h-8 items-center rounded-md px-3 text-xs font-medium tracking-[0.08em] text-muted-fg uppercase transition-colors duration-150 ease-out outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40',
        isActive && 'text-fg',
      )}
    >
      {isActive && (
        // One shared box that slides, so the move reads as going from one section to the next.
        <motion.span
          layoutId="landing-header-active"
          aria-hidden
          className="absolute inset-0 rounded-md border border-fg/20 bg-bg/60"
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
        />
      )}
      <span className="relative">{item.label}</span>
    </a>
  );
}
