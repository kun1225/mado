import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveBlobToDevice } from '#/features/sources/source-media';
import { getAccountDirectory } from '#/features/storage/storage-directory';

import { openExportTarget } from './export-target';

vi.mock('#/features/sources/source-media', () => ({
  saveBlobToDevice: vi.fn(),
}));

vi.mock('#/features/storage/storage-directory', () => ({
  getAccountDirectory: vi.fn(),
}));

const FILE_NAME = 'mado-export-2026-10-19.zip';

function createFileHandle() {
  const writable = new WritableStream<Uint8Array>();
  const file = new File(['zip'], FILE_NAME);
  return {
    writable,
    file,
    handle: {
      createWritable: vi.fn(() => Promise.resolve(writable)),
      getFile: vi.fn(() => Promise.resolve(file)),
    },
  };
}

const HOUR_MS = 60 * 60 * 1000;

function createOldExport(name: string, ageMs: number) {
  return {
    kind: 'file' as const,
    name,
    getFile: () =>
      Promise.resolve(
        new File(['old'], name, { lastModified: Date.now() - ageMs }),
      ),
  };
}

function createAccountDirectory(
  oldExports: ReturnType<typeof createOldExport>[] = [],
  removeError?: DOMException,
) {
  const { handle, file } = createFileHandle();
  const exports = {
    values: async function* () {
      yield* oldExports;
    },
    removeEntry: vi.fn(() =>
      removeError ? Promise.reject(removeError) : Promise.resolve(),
    ),
    getFileHandle: vi.fn(() => Promise.resolve(handle)),
  };
  const account = { getDirectoryHandle: vi.fn(() => Promise.resolve(exports)) };
  vi.mocked(getAccountDirectory).mockResolvedValue(
    account as unknown as FileSystemDirectoryHandle,
  );
  return { account, exports, file };
}

beforeEach(() => vi.clearAllMocks());

afterEach(() => vi.unstubAllGlobals());

describe('openExportTarget', () => {
  it('writes into the file the user picks', async () => {
    const { handle, writable } = createFileHandle();
    const showSaveFilePicker = vi.fn(() => Promise.resolve(handle));
    vi.stubGlobal('window', { showSaveFilePicker });

    const target = await openExportTarget(FILE_NAME);
    await target.finish();

    expect(showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: FILE_NAME }),
    );
    expect(target.writable).toBe(writable);
    expect(getAccountDirectory).not.toHaveBeenCalled();
    expect(saveBlobToDevice).not.toHaveBeenCalled();
  });

  it('passes on the error when the user closes the picker', async () => {
    const error = new DOMException('Closed', 'AbortError');
    vi.stubGlobal('window', {
      showSaveFilePicker: vi.fn(() => Promise.reject(error)),
    });

    await expect(openExportTarget(FILE_NAME)).rejects.toBe(error);
  });

  it('builds in the account folder and downloads it without a picker', async () => {
    vi.stubGlobal('window', {});
    const { account, exports, file } = createAccountDirectory();

    const target = await openExportTarget(FILE_NAME);
    await target.finish();

    expect(account.getDirectoryHandle).toHaveBeenCalledWith('exports', {
      create: true,
    });
    expect(exports.getFileHandle).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]{36}\.zip$/),
      { create: true },
    );
    expect(saveBlobToDevice).toHaveBeenCalledWith(file, FILE_NAME);
  });

  it('removes old zips but keeps recent ones', async () => {
    vi.stubGlobal('window', {});
    const { exports } = createAccountDirectory([
      createOldExport('old.zip', 2 * HOUR_MS),
      createOldExport('recent.zip', 5 * 60 * 1000),
    ]);

    await openExportTarget(FILE_NAME);

    expect(exports.removeEntry).toHaveBeenCalledOnce();
    expect(exports.removeEntry).toHaveBeenCalledWith('old.zip');
  });

  it('still exports when an old zip cannot be removed', async () => {
    vi.stubGlobal('window', {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createAccountDirectory(
      [createOldExport('busy.zip', 2 * HOUR_MS)],
      new DOMException('In use', 'NoModificationAllowedError'),
    );

    await expect(openExportTarget(FILE_NAME)).resolves.toBeDefined();
  });
});
