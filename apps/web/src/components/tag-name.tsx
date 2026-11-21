import { useShowTagGroups } from '#/features/sources/source-preferences';
import { formatTag, parseTag } from '#/features/sources/source-tags';

/** A tag as the user reads it: `style-minimal`, or `minimal` when groups are hidden in Settings. */
export function TagName({ tag }: { tag: string }) {
  const { showTagGroups } = useShowTagGroups();
  const { group, name } = parseTag(tag);

  return (
    <>
      {group && showTagGroups && (
        <span className="text-muted-fg">{group}-</span>
      )}
      {name}
    </>
  );
}

/** The same text as `TagName`, for labels that must be plain strings. */
export function useTagText(): (tag: string) => string {
  const { showTagGroups } = useShowTagGroups();
  return (tag) => formatTag(tag, showTagGroups);
}
