import { Button } from '@repo/ui/button';

import type {
  DesktopFolderPromptProps,
  DesktopLibraryGateProps,
} from '#/features/desktop/desktop.type';
import type {
  DesktopFolderBlockedReason,
  DesktopFolderStatus,
} from '#/features/desktop/desktop-bridge.type';
import {
  useDesktopBridge,
  useLibraryChanges,
  useLibraryFolder,
  useLibraryProblems,
} from '#/features/desktop/desktop-hooks';

/** On the web it shows the page. In the desktop app, the page waits until the library folder is ready. */
export function DesktopLibraryGate({ children }: DesktopLibraryGateProps) {
  const bridge = useDesktopBridge();

  return bridge ? <DesktopFolderGate>{children}</DesktopFolderGate> : children;
}

// *** DesktopFolderGate ***
function DesktopFolderGate({ children }: DesktopLibraryGateProps) {
  const { folder, chooseFolder, choosing, recreateFolder, retryFolder } =
    useLibraryFolder();
  useLibraryChanges();
  useLibraryProblems();

  // Nothing while the status loads, so the prompt does not flash for a library that is fine.
  if (!folder) return null;
  if (folder.status === 'ready') return children;

  return (
    <DesktopFolderPrompt
      folder={folder}
      choosing={choosing}
      onChoose={chooseFolder}
      onRecreate={recreateFolder}
      onRetry={retryFolder}
    />
  );
}

// *** DesktopFolderPrompt ***
function DesktopFolderPrompt({
  folder,
  choosing,
  onChoose,
  onRecreate,
  onRetry,
}: DesktopFolderPromptProps) {
  const { title, body } = toPromptCopy(folder);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="t-h-9">{title}</h1>
      <p className="max-w-md t-b-3 text-muted-fg">{body}</p>
      <div className="flex gap-2">
        <Button onClick={onChoose} disabled={choosing}>
          Choose folder
        </Button>
        {folder.status === 'missing' && (
          <Button variant="outline" onClick={onRecreate} disabled={choosing}>
            Create Mado Folder
          </Button>
        )}
        {folder.status === 'blocked' && (
          <Button variant="outline" onClick={onRetry} disabled={choosing}>
            Try again
          </Button>
        )}
      </div>
    </main>
  );
}

// *** toPromptCopy ***
function toPromptCopy(folder: DesktopFolderStatus) {
  if (folder.status === 'missing') {
    return {
      title: "We can't find your library",
      body: `Mado looked in ${folder.path}. The folder may have moved, been renamed, or be on a drive that is not connected.`,
    };
  }
  if (folder.status !== 'blocked') {
    return {
      title: 'Choose where to keep your library',
      body: 'Mado saves your sources as plain files in a folder you pick, so you can see them in Finder.',
    };
  }
  return BLOCKED_COPY[folder.reason](folder.path);
}

const BLOCKED_COPY = {
  locked: (path: string) => ({
    title: 'Your library is open in another Mado',
    body: `Another copy of Mado is using ${path}. Close it, then try again.`,
  }),
  'needs-update': (path: string) => ({
    title: 'This library needs a newer Mado',
    body: `A newer version of Mado changed the files in ${path}. Update Mado to open it.`,
  }),
  invalid: (path: string) => ({
    title: "We can't read your library",
    body: `The file mado.json in ${path} is broken. Fix it or remove it, then try again.`,
  }),
} satisfies Record<
  DesktopFolderBlockedReason,
  (path: string) => { title: string; body: string }
>;
