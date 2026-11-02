import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteMediaFile, writeMediaFile } from './source-media';

const bridge = {
  media: {
    beginWrite: vi.fn(),
    appendChunk: vi.fn(),
    finishWrite: vi.fn(),
    abortWrite: vi.fn(),
    remove: vi.fn(),
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  bridge.media.beginWrite.mockResolvedValue('write-1');
  vi.stubGlobal('window', { madoDesktop: bridge });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('writeMediaFile in the desktop app', () => {
  it('sends the file in chunks, then finishes the write', async () => {
    const file = new File([new Uint8Array(10)], 'a.webp');

    await writeMediaFile('key-1', file);

    expect(bridge.media.beginWrite).toHaveBeenCalledWith('key-1');
    expect(bridge.media.appendChunk).toHaveBeenCalledTimes(1);
    expect(bridge.media.finishWrite).toHaveBeenCalledWith('write-1');
  });

  it('writes an empty file too', async () => {
    await writeMediaFile('key-1', new File([], 'empty.txt'));

    expect(bridge.media.appendChunk).not.toHaveBeenCalled();
    expect(bridge.media.finishWrite).toHaveBeenCalledWith('write-1');
  });

  it('aborts and explains when a chunk fails', async () => {
    bridge.media.appendChunk.mockRejectedValue(new Error('Disk full'));
    bridge.media.abortWrite.mockResolvedValue(undefined);

    await expect(
      writeMediaFile('key-1', new File(['x'], 'a.webp')),
    ).rejects.toThrow('Failed to store "a.webp" on this device.');

    expect(bridge.media.abortWrite).toHaveBeenCalledWith('write-1');
    expect(bridge.media.finishWrite).not.toHaveBeenCalled();
  });
});

describe('deleteMediaFile in the desktop app', () => {
  it('asks the main process to remove the file', async () => {
    await deleteMediaFile('key-1');

    expect(bridge.media.remove).toHaveBeenCalledWith('key-1');
  });
});
