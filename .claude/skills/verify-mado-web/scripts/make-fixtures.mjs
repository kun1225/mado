#!/usr/bin/env node
// Writes small files into the directory in argv[2]: two PNG images and a Markdown note the app accepts, and a JSON file it refuses.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: make-fixtures.mjs <output-dir>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// A solid-color PNG with no image dependency. Each call differs only by color, so two files never look alike.
function makePng(width, height, [red, green, blue]) {
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      rows.set([red, green, blue], rowStart + 1 + x * 3);
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk(
      'IHDR',
      Buffer.concat([
        uint32(width),
        uint32(height),
        Buffer.from([8, 2, 0, 0, 0]),
      ]),
    ),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  return Buffer.concat([uint32(data.length), body, uint32(crc32(body))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return ~crc;
}

writeFileSync(join(outDir, 'verify-red.png'), makePng(320, 200, [220, 40, 40]));
writeFileSync(
  join(outDir, 'verify-blue.png'),
  makePng(200, 320, [40, 60, 220]),
);
writeFileSync(
  join(outDir, 'verify-note.md'),
  '# Verify note\n\nA short note for the verification run.\n',
);
writeFileSync(join(outDir, 'verify-bad.json'), '{"not": "a source"}\n');
console.log(`wrote 4 fixtures to ${outDir}`);
