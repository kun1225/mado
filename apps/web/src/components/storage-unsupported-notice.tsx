export function StorageUnsupportedNotice() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
      <p className="t-h-9">This browser can't store your saves</p>
      <p className="t-b-3 text-muted-fg">
        Open Mado in the latest Chrome, Edge, Firefox, or Safari.
      </p>
    </div>
  );
}
