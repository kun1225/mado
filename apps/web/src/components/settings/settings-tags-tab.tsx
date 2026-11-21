import { useState } from 'react';

import { toast } from '@repo/ui/sonner';

import { useTagText } from '#/components/tag-name';
import {
  useAllSources,
  useChangeTagGroup,
} from '#/features/sources/hooks/source-hooks';
import { useSourceTagFilter } from '#/features/sources/hooks/source-interaction-hooks';
import { useShowTagGroups } from '#/features/sources/source-preferences';
import { countTags, groupTagCounts } from '#/features/sources/source-tags';
import type { SourceTagChange } from '#/features/sources/source-tags.type';

import { SettingsSwitchRow } from './settings-general-tab';
import { SettingsTagGroupName } from './settings-tag-group-name';
import { SettingsTagGroupsBoard } from './settings-tag-groups-board';

export function SettingsTagsTab() {
  const { showTagGroups, setShowTagGroups } = useShowTagGroups();
  const sourcesQuery = useAllSources();
  const counts = countTags(sourcesQuery.data ?? []);
  const applyChange = useApplyTagChange();
  const tagText = useTagText();
  // The tag waiting for the name of the group it starts.
  const [newGroupTag, setNewGroupTag] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <SettingsSwitchRow
        id="settings-show-tag-groups"
        label="Show group names on tags"
        checked={showTagGroups}
        onCheckedChange={setShowTagGroups}
      />

      {counts.length === 0 ? (
        <p className="t-b-3 text-muted-fg">
          No tags yet. Add one in a source&apos;s details.
        </p>
      ) : (
        <SettingsTagGroupsBoard
          groups={groupTagCounts(counts)}
          onMove={(tag, group) => applyChange({ kind: 'move', tag, group })}
          onNewGroup={setNewGroupTag}
          onRenameGroup={(from, to) =>
            applyChange({ kind: 'rename-group', from, to })
          }
        />
      )}

      {newGroupTag && (
        <SettingsTagGroupName
          key={newGroupTag}
          label={`New group for ${tagText(newGroupTag)}`}
          onSubmit={(group) => {
            setNewGroupTag(null);
            applyChange({ kind: 'move', tag: newGroupTag, group });
          }}
          onCancel={() => setNewGroupTag(null)}
        />
      )}
    </div>
  );
}

// *** useApplyTagChange ***
// A `?tags=` filter holding a renamed tag follows the new name, so the page doesn't go empty.
function useApplyTagChange() {
  const changeTagGroup = useChangeTagGroup();
  const { selected, setSelected } = useSourceTagFilter();

  return (change: SourceTagChange) =>
    changeTagGroup.mutate(change, {
      onSuccess: ({ count, renames }) => {
        if (count === 0) return;
        const map = new Map(renames.map(({ from, to }) => [from, to]));
        if (selected.some((tag) => map.has(tag))) {
          setSelected([...new Set(selected.map((tag) => map.get(tag) ?? tag))]);
        }
        toast.success(
          `Updated ${count} ${count === 1 ? 'source' : 'sources'}.`,
        );
      },
      // The only expected failure is a tag that would get too long, and its message says so.
      onError: (error) => toast.error(error.message),
    });
}
