import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createLibraryMedia } from './library-media.js';

let base;
let mediaRoot;

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'mado-media-'));
  mediaRoot = join(base, 'media');
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

async function writeInChunks(media, key, chunks) {
  const writeId = await media.beginWrite(key);
  for (const chunk of chunks) await media.appendChunk(writeId, chunk);
  await media.finishWrite(writeId);
}

describe('writing', () => {
  it('saves the chunks as one file', async () => {
    const media = await createLibraryMedia(mediaRoot);

    await writeInChunks(media, 'a', [Buffer.from('hel'), Buffer.from('lo')]);

    assert.equal(await readFile(media.resolvePath('a'), 'utf8'), 'hello');
  });

  it('shows the file only when it is complete', async () => {
    const media = await createLibraryMedia(mediaRoot);
    const writeId = await media.beginWrite('a');
    await media.appendChunk(writeId, Buffer.from('half'));

    assert.deepEqual(
      (await readdir(mediaRoot)).filter((name) => name === 'a'),
      [],
    );

    await media.finishWrite(writeId);
    assert.deepEqual(
      (await readdir(mediaRoot)).filter((name) => name === 'a'),
      ['a'],
    );
  });

  it('leaves nothing behind when a write is aborted', async () => {
    const media = await createLibraryMedia(mediaRoot);
    const writeId = await media.beginWrite('a');
    await media.appendChunk(writeId, Buffer.from('half'));

    await media.abortWrite(writeId);

    assert.deepEqual(await readdir(mediaRoot), []);
  });

  it('rejects an unknown write id', async () => {
    const media = await createLibraryMedia(mediaRoot);

    await assert.rejects(
      media.appendChunk('nope', Buffer.from('x')),
      /Unknown write/,
    );
  });
});

describe('remove', () => {
  it('deletes the file and ignores a missing one', async () => {
    const media = await createLibraryMedia(mediaRoot);
    await writeInChunks(media, 'a', [Buffer.from('x')]);

    await media.remove('a');
    await media.remove('a');

    assert.deepEqual(await readdir(mediaRoot), []);
  });
});

describe('keys', () => {
  it('keeps every key inside the media folder', async () => {
    const media = await createLibraryMedia(mediaRoot);

    for (const key of ['../escape', 'a/b', '%2e%2e', '..a']) {
      const path = media.resolvePath(key);
      assert.equal(path.startsWith(`${mediaRoot}/`), true, key);
      assert.equal(path.slice(mediaRoot.length + 1).includes('/'), false, key);
    }
  });

  it('refuses keys that name a folder or nothing', async () => {
    const media = await createLibraryMedia(mediaRoot);

    for (const key of ['', '.', '..']) {
      assert.throws(() => media.resolvePath(key), /Invalid media key/, key);
    }
  });

  it('writes a tricky key as a plain file', async () => {
    const media = await createLibraryMedia(mediaRoot);

    await writeInChunks(media, '../x', [Buffer.from('ok')]);

    assert.equal((await readdir(mediaRoot)).length, 1);
    assert.equal(await readFile(media.resolvePath('../x'), 'utf8'), 'ok');
  });
});
