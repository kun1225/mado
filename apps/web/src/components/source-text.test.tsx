import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SourceTextDocument } from './source-text';

function render(body: string, format: 'markdown' | 'plain' = 'markdown') {
  return renderToStaticMarkup(
    <SourceTextDocument text={{ body, format, fileName: 'a.md' }} />,
  );
}

describe('SourceTextDocument', () => {
  it('draws Markdown with GFM tables and task lists', () => {
    const html = render('# Title\n\n| a |\n| - |\n| 1 |\n\n- [x] done');

    expect(html).toContain('<h1');
    expect(html).toContain('<table');
    expect(html).toContain('type="checkbox"');
  });

  it('shows raw HTML as text, never as elements', () => {
    const html = render('<script>alert(1)</script>\n\n<b onclick="x()">hi</b>');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<b');
  });

  it('drops javascript links and opens others in a new tab', () => {
    const html = render('[bad](javascript:alert(1)) [good](https://a.com)');

    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://a.com"');
    expect(html).toContain('rel="noreferrer"');
  });

  it('never loads a remote image', () => {
    const html = render('![Logo](https://tracker.example/pixel.png)');

    expect(html).not.toContain('<img');
    expect(html).toContain('>Logo</a>');
  });

  it('keeps plain text as it is', () => {
    const html = render('# not a heading\n<b>', 'plain');

    expect(html).not.toContain('<h1');
    expect(html).toContain('# not a heading\n&lt;b&gt;');
  });
});
