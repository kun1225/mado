# Roadmap

What we plan to build, in rough order. Details for near-term work live in each feature's `## Planned` section. Bigger ideas live here until they get their own spec.

## Now / Next

Small enough to build on the local-first app we have today.

| Feature                                                  | Spec                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Import a folder (subfolders become nested collections)   | [`sources.spec.md`](../apps/web/src/features/sources/sources.spec.md)    |
| A more fun embed loading state (two eyes looking around) | [`sources.spec.md`](../apps/web/src/features/sources/sources.spec.md)    |
| Google sign-in in the settings panel                     | [`auth.spec.md`](../apps/web/src/features/auth/auth.spec.md)             |
| Dark mode (follow the system, with a switch in settings) | [`settings.spec.md`](../apps/web/src/features/settings/settings.spec.md) |

## Later

These need data to leave the device, so they come after cloud storage and sync (see "Cloud Storage" and "Sync" in [`prd.md`](prd.md)).

### Cloud backup and sync

The base for everything below. Without a server copy, nobody else can see your data.

### Permissions

- Who can view or change a collection, a whiteboard, or a whole workspace.
- Starting idea: the roles in `workspace_members` from the PRD: `owner`, `admin`, `editor`, `viewer`.
- Open question: do we share per workspace, per collection, or both?

### Collaboration

- Several people work in the same workspace or collection.
- Needs: permissions, sync, and a rule for two people editing the same thing (see "Conflict Handling" in the PRD).
- Open question: live (see others' changes right away) or sync-on-refresh first?

### Whiteboard

- A free canvas where users place sources, move and resize them, and group them, like a mood board.
- Can start local-only, so it does not have to wait for sync.
- Open question: is a whiteboard its own thing, or a view of a collection?

### Share a whiteboard

- Send a link so others can see a whiteboard, or edit it if they have permission.
- Needs: whiteboard, permissions, cloud storage.
- Open question: can people without an account view a shared link?

## Order and why

1. **Now / Next** first. They help every user today and need no server.
2. **Whiteboard (local)** can come early, because it only needs local data.
3. **Cloud backup and sync** unlocks everything that involves other people.
4. **Permissions** before **collaboration** and **sharing**, so nothing is shared by accident.
