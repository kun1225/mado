import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { RefObject } from 'react';

// Internal reference page, so search engines should skip it.
export const Route = createFileRoute('/ui-system')({
  head: () => ({
    meta: [
      { title: 'UI system — Mado' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [
      {
        // t-h-3 uses this font; only the landing page loads it otherwise.
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap',
      },
    ],
  }),
  component: UiSystem,
});

function UiSystem() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="t-h-5">UI system</h1>
      <p className="mt-2 t-b-3 text-muted-fg">
        Use these classes for all text. The sizes are --t-* tokens in
        packages/ui/src/styles.css.
      </p>

      {TYPOGRAPHY_GROUPS.map((group) => (
        <section key={group.title} className="mt-14">
          <h2 className="border-b border-border pb-3 t-l-3 text-muted-fg">
            {group.title}
          </h2>
          <ul>
            {group.styles.map((style) => (
              <TypeStyleRow key={style.name} style={style} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

// *** TypeStyleRow ***
function TypeStyleRow({
  style,
}: {
  style: { name: string; use: string; sample: string };
}) {
  const sampleRef = useRef<HTMLParagraphElement>(null);
  const specs = useTypeSpecs(sampleRef);

  return (
    <li className="grid gap-2 border-b border-border py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
      <div>
        <code className="t-l-2 font-mono">{style.name}</code>
        <p className="mt-1 t-b-4 text-muted-fg">{style.use}</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 t-b-4 font-mono text-muted-fg">
          <dt>size</dt>
          <dd>{specs ? `${specs.size}px` : '—'}</dd>
          <dt>line-height</dt>
          <dd>{specs ? specs.lineHeight : '—'}</dd>
          <dt>leading</dt>
          <dd>{specs ? `${specs.leading}px` : '—'}</dd>
        </dl>
      </div>
      <p ref={sampleRef} className={`${style.name} min-w-0 break-words`}>
        {style.sample}
      </p>
    </li>
  );
}

// *** useTypeSpecs ***
function useTypeSpecs(ref: RefObject<HTMLElement | null>) {
  const [specs, setSpecs] = useState<ReturnType<typeof readTypeSpecs> | null>(
    null,
  );

  useEffect(() => {
    const update = () => {
      if (ref.current) setSpecs(readTypeSpecs(ref.current));
    };
    update();
    // Some tokens change below the sm breakpoint, so read them again on resize.
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);

  return specs;
}

// *** readTypeSpecs ***
function readTypeSpecs(element: HTMLElement) {
  const { fontSize, lineHeight } = getComputedStyle(element);
  const size = parseFloat(fontSize);
  const leading = parseFloat(lineHeight);

  return {
    size: trimNumber(size, 1),
    lineHeight: trimNumber(leading / size, 3),
    leading: trimNumber(leading, 1),
  };
}

// *** trimNumber ***
function trimNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

const TYPOGRAPHY_GROUPS = [
  {
    title: 'Headings',
    styles: [
      { name: 't-h-1', use: 'Landing hero', sample: 'Frame what you see' },
      {
        name: 't-h-2',
        use: 'Landing section title',
        sample: 'Built for taste',
      },
      { name: 't-h-3', use: 'Accent number (serif italic)', sample: '01' },
      {
        name: 't-h-4',
        use: 'Saved text heading 1 (serif)',
        sample: 'On restraint',
      },
      {
        name: 't-h-5',
        use: 'Page title, big numbers',
        sample: 'Moodboard 2026',
      },
      {
        name: 't-h-6',
        use: 'Saved text heading 2 (serif)',
        sample: 'Less, but better',
      },
      {
        name: 't-h-7',
        use: 'Saved text heading 3, quote card (serif)',
        sample: 'Good design is honest.',
      },
      { name: 't-h-8', use: 'Dialog title', sample: 'Rename collection' },
      {
        name: 't-h-9',
        use: 'Small title, empty state',
        sample: 'Nothing here yet',
      },
    ],
  },
  {
    title: 'Body',
    styles: [
      {
        name: 't-b-1',
        use: 'Landing lead text',
        sample: 'A quiet library for brand designers.',
      },
      {
        name: 't-b-2',
        use: 'Inputs (mobile), saved text',
        sample: 'Collect images, videos, sites and notes.',
      },
      {
        name: 't-b-3',
        use: 'Default UI text',
        sample: 'Keep it all on your device.',
      },
      {
        name: 't-b-4',
        use: 'Hints, meta, tooltips',
        sample: '12 sources · 3.4 MB',
      },
    ],
  },
  {
    title: 'Labels',
    styles: [
      { name: 't-l-1', use: 'Large button, wordmark', sample: 'Open Mado' },
      { name: 't-l-2', use: 'Button, tab, card name', sample: 'Add website' },
      { name: 't-l-3', use: 'Menu group, pill', sample: 'Coming soon' },
      { name: 't-l-4', use: 'Caption on a card', sample: 'instagram.com' },
    ],
  },
];
