import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RevealText } from './reveal';

function wordOrders(html: string) {
  return [...html.matchAll(/--i:(\d+)/g)].map((match) => Number(match[1]));
}

describe('RevealText', () => {
  it('wraps each word in its own span, in reading order', () => {
    const html = renderToStaticMarkup(
      <RevealText>Frame what you see.</RevealText>,
    );

    expect(wordOrders(html)).toEqual([0, 1, 2, 3]);
    expect(html).toContain('>Frame</span> <span');
  });

  it('splits words inside nested elements and keeps the elements', () => {
    const html = renderToStaticMarkup(
      <RevealText as="h1">
        Frame what <em>you see</em>.
      </RevealText>,
    );

    expect(html.startsWith('<h1')).toBe(true);
    expect(html).toMatch(
      /<em><span[^>]*>you<\/span> <span[^>]*>see<\/span><\/em>/,
    );
    expect(wordOrders(html)).toEqual([0, 1, 2, 3, 4]);
  });

  it('marks the root so the observer can reveal it', () => {
    const html = renderToStaticMarkup(<RevealText>Hi</RevealText>);

    expect(html).toContain('data-reveal=""');
  });
});
