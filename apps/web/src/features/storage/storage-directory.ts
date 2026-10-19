import { getStorageAccount } from './storage-account';

/** The OPFS folder for the current account. Guests use the OPFS root. */
export async function getAccountDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  const account = getStorageAccount();
  if (!account) return root;

  return root.getDirectoryHandle(`account-${encodeURIComponent(account)}`, {
    create: true,
  });
}
