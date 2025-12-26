export function TitleBar() {
  return (
    <div
      className="flex h-10 select-none items-center justify-center border-border border-b bg-card"
      data-tauri-drag-region
    >
      <span className="pointer-events-none font-medium text-muted-foreground text-sm">
        youtube.pub
      </span>
    </div>
  );
}
