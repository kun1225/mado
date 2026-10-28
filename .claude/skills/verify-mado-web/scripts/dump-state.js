// Run through dump-state.sh. It is one function expression, because playwright-cli wraps it as `await (<code>)(page)`.
// Prints the guest library as JSON: every IndexedDB record and every OPFS file with its size. Reads only.
async (page) => {
  return await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mado');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readAll = (storeName) =>
      new Promise((resolve, reject) => {
        const request = database
          .transaction(storeName)
          .objectStore(storeName)
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

    const collections = await readAll('collections');
    const sources = await readAll('sources');
    database.close();

    const files = [];
    async function walk(directory, path) {
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind === 'directory') await walk(handle, `${path}${name}/`);
        else
          files.push({
            path: `${path}${name}`,
            bytes: (await handle.getFile()).size,
          });
      }
    }
    await walk(await navigator.storage.getDirectory(), '');

    return {
      collections: collections.map(({ id, name, parentId, color }) => ({
        id,
        name,
        parentId,
        color,
      })),
      sources: sources.map(
        ({
          id,
          name,
          kind,
          collectionIds,
          storageKey,
          mimeType,
          deletedAt,
        }) => ({
          id,
          name,
          kind,
          collectionIds,
          storageKey,
          mimeType,
          deletedAt: deletedAt ?? null,
        }),
      ),
      files,
    };
  });
};
