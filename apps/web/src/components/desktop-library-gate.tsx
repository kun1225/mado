import { Button } from '@repo/ui/button';

import type {
  DesktopFolderPromptProps,
  DesktopLibraryGateProps,
} from '#/features/desktop/desktop.type';
import {
  useDesktopBridge,
  useLibraryChanges,
  useLibraryFolder,
} from '#/features/desktop/desktop-hooks';

/** On the web it shows the page. In the desktop app, the page waits until the library folder is ready. */
export function DesktopLibraryGate({ children }: DesktopLibraryGateProps) {
  const bridge = useDesktopBridge();

  return bridge ? <DesktopFolderGate>{children}</DesktopFolderGate> : children;
}

// *** DesktopFolderGate ***
function DesktopFolderGate({ children }: DesktopLibraryGateProps) {
  const { folder, chooseFolder, choosing, retryFolder } = useLibraryFolder();
  useLibraryChanges();

  // Nothing while the status loads, so the prompt does not flash for a library that is fine.
  if (!folder) return null;
  if (folder.status === 'ready') return children;

  return (
    <DesktopFolderPrompt
      folder={folder}
      choosing={choosing}
      onChoose={chooseFolder}
      onRetry={retryFolder}
    />
  );
}

// *** DesktopFolderPrompt ***
function DesktopFolderPrompt({
  folder,
  choosing,
  onChoose,
  onRetry,
}: DesktopFolderPromptProps) {
  const missing = folder.status === 'missing';

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="t-h-9">
        {missing
          ? "We can't find your library"
          : 'Choose where to keep your library'}
      </h1>
      <p className="max-w-md t-b-3 text-muted-fg">
        {missing
          ? `Mado looked in ${folder.path}. The folder may have moved, been renamed, or be on a drive that is not connected.`
          : 'Mado saves your sources as plain files in a folder you pick, so you can see them in Finder.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={onChoose} disabled={choosing}>
          Choose folder
        </Button>
        {missing && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </main>
  );
}
