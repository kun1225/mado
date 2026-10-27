import { describe, expect, it } from 'vitest';

import {
  detectTextFormat,
  MAX_TEXT_BYTES,
  readTextContent,
  textBodySchema,
  toTextCardTitle,
} from './text-source';
import type { TextSourceContent } from './text-source.type';

function markdown(body: string): TextSourceContent {
  return { body, format: 'markdown', fileName: 'note.md' };
}

describe('detectTextFormat', () => {
  it.each([
    ['note.md', 'text/markdown', 'markdown'],
    ['note.md', 'text/x-markdown', 'markdown'],
    ['note.txt', 'text/plain', 'plain'],
    // Windows and some Linux desktops give Markdown no type at all.
    ['note.md', '', 'markdown'],
    ['NOTE.MARKDOWN', '', 'markdown'],
    ['note.txt', 'application/octet-stream', 'plain'],
  ])('reads %s (%s) as %s', (name, type, format) => {
    expect(detectTextFormat({ name, type })).toBe(format);
  });

  it.each([
    ['page.html', 'text/html'],
    ['table.csv', 'text/csv'],
    ['script.js', 'text/javascript'],
    ['photo.png', 'image/png'],
    ['notes', ''],
    // The type wins over the extension, so a renamed page is not let in.
    ['page.md', 'text/html'],
  ])('rejects %s (%s)', (name, type) => {
    expect(detectTextFormat({ name, type })).toBeNull();
  });
});

describe('toTextCardTitle', () => {
  it('uses the first heading', () => {
    expect(
      toTextCardTitle(markdown('Intro line.\n\n## Brand **brief**'), 'x'),
    ).toBe('Brand brief');
  });

  it('cuts the first line at the end of its first sentence', () => {
    expect(
      toTextCardTitle(markdown('Warm and slow. Not the to-go line.'), 'x'),
    ).toBe('Warm and slow.');
  });

  it('removes Markdown signs and keeps link text', () => {
    expect(
      toTextCardTitle(
        markdown('- See [the board](https://a.b/c.d) and _this_ `code`'),
        'x',
      ),
    ).toBe('See the board and this code');
  });

  it('skips front matter and lines with no words', () => {
    expect(toTextCardTitle(markdown('---\n***\n\nHello there'), 'x')).toBe(
      'Hello there',
    );
  });

  it('keeps Markdown signs in plain text', () => {
    expect(
      toTextCardTitle(
        { body: '# not a heading', format: 'plain', fileName: 'a.txt' },
        'x',
      ),
    ).toBe('# not a heading');
  });

  it('falls back to the name when there are no words', () => {
    expect(toTextCardTitle(markdown('   \n---\n'), 'Brief')).toBe('Brief');
  });

  it('keeps a long first line short', () => {
    expect(toTextCardTitle(markdown('a'.repeat(500)), 'x')).toHaveLength(200);
  });
});

describe('textBodySchema', () => {
  it('rejects text with only spaces', () => {
    expect(() => textBodySchema.parse(' \n ')).toThrow('Text is empty');
  });

  it('counts bytes, not letters', () => {
    // Each emoji is 4 bytes, so this is over the limit with far fewer letters.
    const body = '😀'.repeat(MAX_TEXT_BYTES / 4 + 1);

    expect(() => textBodySchema.parse(body)).toThrow('smaller than 1MB');
  });
});

describe('readTextContent', () => {
  it('reads the body, format and name of a file', async () => {
    const file = new File(['# Hi 😀'], 'brief.md', { type: '' });

    await expect(readTextContent(file)).resolves.toEqual({
      body: '# Hi 😀',
      format: 'markdown',
      fileName: 'brief.md',
    });
  });
});
