import { useMediaObjectUrl } from '#/features/sources/hooks/source-hooks';
import type { Source } from '#/features/sources/source-types';

export function SourceDetailViewer({ source }: { source: Source }) {
  const objectUrl = useMediaObjectUrl(source.storageKey, source.mimeType);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {objectUrl === null && (
        <div className="m-auto size-24 animate-pulse rounded-md bg-bg/10" />
      )}

      {objectUrl !== null && source.kind === 'image' && (
        <img
          src={objectUrl}
          alt={source.name}
          className="size-full object-contain"
        />
      )}

      {objectUrl !== null && source.kind === 'video' && (
        <video
          src={objectUrl}
          controls
          autoPlay
          loop
          playsInline
          className="size-full object-contain"
        />
      )}
    </div>
  );
}
