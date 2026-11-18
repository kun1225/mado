import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { acquireLock } from './library-lock.js';

let root;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mado-lock-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const alive = () => true;
const dead = () => false;

describe('acquireLock', () => {
  it('locks a free folder and frees it on release', async () => {
    const lock = await acquireLock(root, { pid: 10, isAlive: alive });
    assert.ok(lock);
    assert.deepEqual(await readdir(root), ['.mado-lock']);

    await lock.release();
    assert.deepEqual(await readdir(root), []);
  });

  it('refuses a folder another running app holds', async () => {
    await acquireLock(root, { pid: 10, isAlive: alive });

    assert.equal(await acquireLock(root, { pid: 20, isAlive: alive }), null);
  });

  it('takes over a lock left by an app that crashed', async () => {
    await acquireLock(root, { pid: 10, isAlive: alive });

    const lock = await acquireLock(root, { pid: 20, isAlive: dead });
    assert.ok(lock);
    // The crashed app's lock is gone, so the next app sees the new owner.
    assert.equal(await acquireLock(root, { pid: 30, isAlive: alive }), null);
  });

  it('opens again in the same app, for example after switching folders back', async () => {
    await acquireLock(root, { pid: 10, isAlive: alive });

    assert.ok(await acquireLock(root, { pid: 10, isAlive: alive }));
  });

  it('takes over a broken lock file', async () => {
    await writeFile(join(root, '.mado-lock'), 'not json');

    assert.ok(await acquireLock(root, { pid: 10, isAlive: alive }));
  });

  it('does not remove a lock another app took after ours went stale', async () => {
    const first = await acquireLock(root, { pid: 10, isAlive: alive });
    await acquireLock(root, { pid: 20, isAlive: dead });

    await first.release();
    assert.deepEqual(await readdir(root), ['.mado-lock']);
  });

  it('writes the whole lock and leaves no temp file', async () => {
    await acquireLock(root, { pid: 10, isAlive: alive });

    assert.equal(
      await readFile(join(root, '.mado-lock'), 'utf8'),
      '{\n  "pid": 10\n}\n',
    );
    assert.deepEqual(await readdir(root), ['.mado-lock']);
  });
});
