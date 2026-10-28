import type { SettingsProgressProps } from '#/features/settings/settings.type';

// The label is not a live region, because reading every file count aloud would be noise.
export function SettingsProgress({
  name,
  label,
  progress,
}: SettingsProgressProps) {
  const ratio = progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <div className="space-y-2">
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <p className="t-b-4 text-muted-fg tabular-nums">{label}</p>
    </div>
  );
}
