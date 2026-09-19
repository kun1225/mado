import { Button } from '@repo/ui/button';

export function SourceSelectionBar({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-action-bar flex justify-center px-edge">
      <div className="pointer-events-auto flex animate-in items-center gap-1 rounded-full border border-border bg-bg py-2 pr-2 pl-4 shadow-md duration-slow ease-out-back fade-in-0 slide-in-from-bottom-2">
        <p className="text-sm font-medium text-fg">{count} selected</p>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="rounded-full text-muted-fg"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
