const SKELETON_COUNT = 3;

/** Same size as `LibraryCollectionCard`, so real cards replace it in place. */
export function LibraryCollectionCardSkeletons() {
  return Array.from({ length: SKELETON_COUNT }, (_, index) => (
    <div
      key={index}
      aria-hidden
      className="size-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
    />
  ));
}
