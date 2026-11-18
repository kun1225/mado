import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { prepareSchema, SCHEMA_VERSION } from './library-schema.js';

let root;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mado-schema-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function readSchemaFile() {
  return JSON.parse(await readFile(join(root, 'mado.json'), 'utf8'));
}

describe('prepareSchema', () => {
  it('labels a folder without mado.json as the current version', async () => {
    assert.deepEqual(await prepareSchema(root), { ok: true });
    assert.deepEqual(await readSchemaFile(), {
      schemaVersion: SCHEMA_VERSION,
    });
  });

  it('runs each missing migration once, in order, then writes the version', async () => {
    await writeFile(join(root, 'mado.json'), '{ "schemaVersion": 1 }\n');
    const ran = [];
    const migrations = {
      2: async () => ran.push(2),
      3: async () => ran.push(3),
    };

    assert.deepEqual(await prepareSchema(root, { version: 3, migrations }), {
      ok: true,
    });
    assert.deepEqual(ran, [2, 3]);
    assert.deepEqual(await readSchemaFile(), { schemaVersion: 3 });
  });

  it('runs nothing when the folder is already current', async () => {
    await writeFile(join(root, 'mado.json'), '{ "schemaVersion": 3 }\n');
    const migrations = { 2: () => assert.fail('must not run') };

    assert.deepEqual(await prepareSchema(root, { version: 3, migrations }), {
      ok: true,
    });
  });

  it('refuses a folder from a newer app and leaves the file alone', async () => {
    const text = '{ "schemaVersion": 99 }\n';
    await writeFile(join(root, 'mado.json'), text);

    assert.deepEqual(await prepareSchema(root), {
      ok: false,
      reason: 'needs-update',
    });
    assert.equal(await readFile(join(root, 'mado.json'), 'utf8'), text);
  });

  it('does not write the version when a migration fails', async () => {
    await writeFile(join(root, 'mado.json'), '{ "schemaVersion": 1 }\n');
    const migrations = {
      2: async () => {
        throw new Error('boom');
      },
    };

    await assert.rejects(prepareSchema(root, { version: 2, migrations }));
    assert.deepEqual(await readSchemaFile(), { schemaVersion: 1 });
  });

  it('refuses a mado.json it cannot read instead of failing to open', async () => {
    await mkdir(join(root, 'mado.json'));

    assert.deepEqual(await prepareSchema(root), {
      ok: false,
      reason: 'invalid',
    });
  });

  it('refuses a broken mado.json instead of guessing version 1', async () => {
    const text = 'not json';
    await writeFile(join(root, 'mado.json'), text);

    assert.deepEqual(await prepareSchema(root), {
      ok: false,
      reason: 'invalid',
    });
    assert.equal(await readFile(join(root, 'mado.json'), 'utf8'), text);
  });
});
