import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Source } from '#/features/sources/source-types';

import { SourceCardCaption } from './source-card';

function render(overrides: Partial<Source>) {
  const source = { id: 's1', name: 'Supahero', ...overrides } as Source;
  return renderToStaticMarkup(<SourceCardCaption source={source} />);
}

describe('SourceCardCaption', () => {
  it('shows the name and the site for a website', () => {
    const html = render({
      kind: 'website',
      site: { domain: 'supahero.io' } as Source['site'],
    });

    expect(html).toContain('<figcaption');
    expect(html).toContain('Supahero');
    expect(html).toContain('— supahero.io');
  });

  it('shows only the name for a file', () => {
    const html = render({ kind: 'image' });

    expect(html).toContain('Supahero');
    expect(html).not.toContain('—');
  });
});
