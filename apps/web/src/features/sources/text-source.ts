import { z } from 'zod';

import type { TextSourceContent, TextSourceFormat } from './text-source.type';

// A text source is drawn in full, and a huge file would freeze the Markdown renderer.
export const MAX_TEXT_MB = 1;

export const MAX_TEXT_BYTES = MAX_TEXT_MB * 1024 * 1024;

export const TEXT_FILE_ACCEPT: Record<string, string[]> = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
};

const FORMAT_BY_TYPE: Record<string, TextSourceFormat> = {
  'text/plain': 'plain',
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
};

const FORMAT_BY_EXTENSION: Record<string, TextSourceFormat> = {
  '.txt': 'plain',
  '.md': 'markdown',
  '.markdown': 'markdown',
};

// Many systems give `.md` no type, or a generic one, so only then the extension decides.
const UNKNOWN_TYPES = new Set(['', 'application/octet-stream']);

export function detectTextFormat(
  file: Pick<File, 'name' | 'type'>,
): TextSourceFormat | null {
  if (!UNKNOWN_TYPES.has(file.type)) return FORMAT_BY_TYPE[file.type] ?? null;

  return FORMAT_BY_EXTENSION[toExtension(file.name)] ?? null;
}

// *** toExtension ***
function toExtension(name: string): string {
  return /\.[^.]+$/.exec(name)?.[0].toLowerCase() ?? '';
}

export const textBodySchema = z
  .string()
  .refine((body) => body.trim().length > 0, 'Text is empty')
  .refine(
    (body) => new TextEncoder().encode(body).length <= MAX_TEXT_BYTES,
    `Text must be smaller than ${MAX_TEXT_MB}MB`,
  );

export async function readTextContent(file: File): Promise<TextSourceContent> {
  return {
    body: textBodySchema.parse(await file.text()),
    format: detectTextFormat(file) ?? 'plain',
    fileName: file.name,
  };
}

const DEFAULT_NOTE_TITLE = 'Untitled note';

export function toNoteFile(title: string, body: string): File {
  return new File([body], `${title.trim() || DEFAULT_NOTE_TITLE}.md`, {
    type: toTextMimeType('markdown'),
  });
}

export function toTextMimeType(format: TextSourceFormat): string {
  return format === 'markdown' ? 'text/markdown' : 'text/plain';
}

const MAX_TITLE_LENGTH = 200;

/** The card shows one sentence, like a headline, so a long note still reads at a glance. */
export function toTextCardTitle(
  text: TextSourceContent,
  fallback: string,
): string {
  const isMarkdown = text.format === 'markdown';
  const lines = text.body
    .split('\n')
    .map((line) => (isMarkdown ? stripMarkdown(line) : line.trim()))
    .filter((line) => /[\p{L}\p{N}]/u.test(line));
  const heading = isMarkdown
    ? text.body.split('\n').find((line) => /^\s{0,3}#{1,6}\s/.test(line))
    : undefined;
  const title = heading
    ? stripMarkdown(heading)
    : toFirstSentence(lines[0] ?? '');

  return title.slice(0, MAX_TITLE_LENGTH) || fallback;
}

// *** stripMarkdown ***
function stripMarkdown(line: string): string {
  return line
    .replace(/^\s*(#{1,6}\s+|>\s?|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|[*_`])/g, '')
    .trim();
}

// *** toFirstSentence ***
function toFirstSentence(line: string): string {
  return /^.*?[.!?。！？](?=\s|$)/u.exec(line)?.[0] ?? line;
}
