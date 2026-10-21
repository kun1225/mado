export type StorageUsage = {
  usage: number;
  /** Null when the browser gives no limit. */
  quota: number | null;
};

/** Bytes this site uses and may use, or null when the browser cannot say. */
export async function readStorageUsage(): Promise<StorageUsage | null> {
  if (typeof navigator === 'undefined') return null;
  // Insecure pages have no `navigator.storage` at all, which the DOM types don't show.
  if (!('storage' in navigator)) return null;
  if (typeof navigator.storage.estimate !== 'function') return null;

  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage == null) return null;
    return { usage, quota: quota ?? null };
  } catch (error) {
    // A missing number only hides the storage section, so it should not break the tab.
    console.error('Failed to read the storage usage', error);
    return null;
  }
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  const unit = Math.min(
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** unit;
  // Fewer digits as the number grows, so every size stays about as wide.
  const digits = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${BYTE_UNITS[unit]}`;
}
