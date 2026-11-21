import { useEffect, useRef, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { cn } from '@repo/ui/cn';
import {
  MorphDropdownMenu,
  MorphDropdownMenuContent,
  MorphDropdownMenuItem,
  MorphDropdownMenuSeparator,
  MorphDropdownMenuTrigger,
} from '@repo/ui/morph-dropdown-menu';

import { TagName, useTagText } from '#/components/tag-name';
import type { SettingsTagDropTarget } from '#/features/settings/settings.type';
import { parseTag } from '#/features/sources/source-tags';
import type {
  SourceTagCount,
  SourceTagGroup,
} from '#/features/sources/source-tags.type';

import { SettingsTagGroupName } from './settings-tag-group-name';

const NEW_GROUP_ID = 'new-group';
// A small move before a drag starts, so a click on a row's menu stays a click.
const DRAG_START_DISTANCE = 4;

/**
 * Tags in boxes by group. Drag a tag onto another box, or use its menu, to change its group.
 * Drag is for the pointer only. The menu is the keyboard way, so there is no second keyboard path to learn.
 */
export function SettingsTagGroupsBoard({
  groups,
  onMove,
  onNewGroup,
  onRenameGroup,
}: {
  groups: SourceTagGroup[];
  onMove: (tag: string, group: string | null) => void;
  onNewGroup: (tag: string) => void;
  onRenameGroup: (from: string, to: string) => void;
}) {
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const isCancelledRef = useEscapeToCancel(draggedTag !== null, () =>
    setDraggedTag(null),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_START_DISTANCE },
    }),
  );
  const groupNames = groups
    .map(({ group }) => group)
    .filter((group) => group !== null);
  // Always there, so a tag can be dragged out of its group even when every tag has one.
  const boxes = groups.some(({ group }) => group === null)
    ? groups
    : [...groups, { group: null, counts: [] }];

  function drop({ active, over }: DragEndEvent) {
    setDraggedTag(null);
    const target = over?.data.current as SettingsTagDropTarget | undefined;
    if (!target || isCancelledRef.current) return;

    const tag = String(active.id);
    if ('isNewGroup' in target) onNewGroup(tag);
    else onMove(tag, target.group);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => {
        isCancelledRef.current = false;
        setDraggedTag(String(active.id));
      }}
      onDragEnd={drop}
      onDragCancel={() => setDraggedTag(null)}
    >
      <div className="flex flex-col gap-3">
        {boxes.map(({ group, counts }) => (
          <GroupBox
            key={group ?? ''}
            group={group}
            onRename={(to) => group && onRenameGroup(group, to)}
          >
            {counts.map((count) => (
              <TagRow
                key={count.tag}
                count={count}
                groupNames={groupNames}
                onMove={(target) => onMove(count.tag, target)}
                onNewGroup={() => onNewGroup(count.tag)}
              />
            ))}
          </GroupBox>
        ))}
        <NewGroupBox />
      </div>
      <DragOverlay>
        {draggedTag && (
          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 t-b-4 text-fg shadow-lg">
            <TagName tag={draggedTag} />
          </span>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// *** useEscapeToCancel ***
// The settings dialog takes Escape before dnd-kit sees it, so the dialog would close and the drop
// would still land. Catch it first, keep the dialog open, and ignore the drop.
function useEscapeToCancel(isDragging: boolean, onCancel: () => void) {
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (!isDragging) return;

    function cancel(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      isCancelledRef.current = true;
      onCancel();
    }
    window.addEventListener('keydown', cancel, { capture: true });
    return () =>
      window.removeEventListener('keydown', cancel, { capture: true });
  }, [isDragging, onCancel]);

  return isCancelledRef;
}

// *** GroupBox ***
function GroupBox({
  group,
  onRename,
  children,
}: {
  group: string | null;
  onRename: (to: string) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group:${group ?? ''}`,
    data: { group } satisfies SettingsTagDropTarget,
  });
  const [isRenaming, setIsRenaming] = useState(false);

  return (
    <section
      ref={setNodeRef}
      aria-label={group ?? 'No group'}
      className={cn(
        'flex flex-col gap-1 rounded-md border border-border p-2 transition-colors duration-fast',
        isOver && 'border-ring bg-muted/40',
      )}
    >
      <header className="flex min-h-7 items-center justify-between gap-2 px-1">
        {isRenaming && group ? (
          <SettingsTagGroupName
            label={`Rename ${group}`}
            initial={group}
            onSubmit={(to) => {
              setIsRenaming(false);
              onRename(to);
            }}
            onCancel={() => setIsRenaming(false)}
          />
        ) : (
          <>
            <h3 className="t-b-4 text-muted-fg uppercase">
              {group ?? 'No group'}
            </h3>
            {group && (
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                className="t-b-4 text-muted-fg hover:text-fg"
              >
                Rename
              </button>
            )}
          </>
        )}
      </header>
      {children}
    </section>
  );
}

// *** TagRow ***
function TagRow({
  count,
  groupNames,
  onMove,
  onNewGroup,
}: {
  count: SourceTagCount;
  groupNames: string[];
  onMove: (group: string | null) => void;
  onNewGroup: () => void;
}) {
  const { tag } = count;
  const { group } = parseTag(tag);
  const tagText = useTagText();
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: tag });

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-sm px-1 py-0.5',
        isDragging && 'opacity-40',
      )}
    >
      <span
        ref={setNodeRef}
        {...listeners}
        className="flex-1 cursor-grab touch-none truncate px-1.5 t-b-3 active:cursor-grabbing"
      >
        {parseTag(tag).name}
      </span>
      <span className="t-b-4 text-muted-fg tabular-nums">{count.count}</span>
      <MorphDropdownMenu>
        <MorphDropdownMenuTrigger
          aria-label={`Group of ${tagText(tag)}`}
          className="h-7 rounded-full px-2.5 t-b-4 text-muted-fg hover:text-fg"
        >
          {group ?? 'No group'}
        </MorphDropdownMenuTrigger>
        <MorphDropdownMenuContent align="end">
          {[null, ...groupNames]
            .filter((name) => name !== group)
            .map((name) => (
              <MorphDropdownMenuItem
                key={name ?? ''}
                onClick={() => onMove(name)}
              >
                {name ?? 'No group'}
              </MorphDropdownMenuItem>
            ))}
          <MorphDropdownMenuSeparator />
          <MorphDropdownMenuItem onClick={onNewGroup}>
            New group…
          </MorphDropdownMenuItem>
        </MorphDropdownMenuContent>
      </MorphDropdownMenu>
    </div>
  );
}

// *** NewGroupBox ***
function NewGroupBox() {
  const { setNodeRef, isOver } = useDroppable({
    id: NEW_GROUP_ID,
    data: { isNewGroup: true } satisfies SettingsTagDropTarget,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md border border-dashed border-border p-3 text-center t-b-4 text-muted-fg transition-colors duration-fast',
        isOver && 'border-ring text-fg',
      )}
    >
      + New group: drop a tag here
    </div>
  );
}
