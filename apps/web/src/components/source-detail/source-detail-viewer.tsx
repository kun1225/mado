import { useState } from 'react';

import {
  useCompressingSourceIds,
  useMediaObjectUrl,
} from '#/features/sources/hooks/source-hooks';
import type { Source } from '#/features/sources/source-types';

export function SourceDetailViewer({ source }: { source: Source }) {
  const objectUrl = useMediaObjectUrl(
    source.storageKey,
    source.mimeType,
    source.sizeBytes,
  );
  // Compression swaps the stored file, which breaks a video that is playing.
  const isCompressing = useCompressingSourceIds().has(source.id);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const isUnplayable = objectUrl !== null && failedUrl === objectUrl;
  const isWaitingForVideo = isCompressing && source.kind === 'video';

  if (source.kind === 'website' && source.site) {
    const embed = source.site.embed;
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-bg/10">
          {embed.mode !== 'none' ? (
            <iframe
              src={embed.src}
              title={source.name}
              sandbox={
                embed.mode === 'provider'
                  ? 'allow-scripts allow-same-origin allow-forms allow-popups'
                  : 'allow-scripts allow-forms allow-popups'
              }
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              className="size-full border-0 bg-bg"
            />
          ) : objectUrl || source.site.ogImage ? (
            <img
              src={objectUrl ?? source.site.ogImage ?? undefined}
              alt={`Preview of ${source.name}`}
              className="size-full object-contain"
            />
          ) : (
            <p className="max-w-xs text-center text-sm text-bg/70">
              This website cannot be embedded or captured.
            </p>
          )}
        </div>
        <a
          href={source.url ?? source.site.finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm text-bg underline underline-offset-4"
        >
          Open original site
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {objectUrl === null && source.storageKey && !isWaitingForVideo && (
        <div className="m-auto size-24 animate-pulse rounded-md bg-bg/10" />
      )}

      {isWaitingForVideo && (
        <div
          role="status"
          aria-label={`Optimizing ${source.name}`}
          className="m-auto flex size-24 items-center justify-center rounded-md bg-bg/10"
        >
          <span
            aria-hidden
            className="size-6 animate-spin rounded-full border-2 border-bg border-t-transparent motion-reduce:animate-none"
          />
        </div>
      )}

      {isUnplayable && !isCompressing && (
        <p
          role="alert"
          className="m-auto max-w-xs text-center text-sm text-bg/70"
        >
          This video format can't be played in this browser.
        </p>
      )}

      {objectUrl !== null && source.kind === 'image' && (
        <img
          src={objectUrl}
          alt={source.name}
          className="size-full object-contain"
        />
      )}

      {objectUrl !== null &&
        source.kind === 'video' &&
        !isCompressing &&
        !isUnplayable && (
          <video
            src={objectUrl}
            onError={() => setFailedUrl(objectUrl)}
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
