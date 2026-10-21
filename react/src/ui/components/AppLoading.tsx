// The one loading indicator (design/DESIGN.md): a spinner ring and visible text in a role="status"
// region. Its styles are in index.html, so the startup screen looks the same before the app's CSS loads.
export function AppLoading({ label, variant = 'page' }: { label: string; variant?: 'screen' | 'overlay' | 'page' }) {
  return (
    <div className={`app-loading${variant === 'page' ? '' : ` app-loading--${variant}`}`} role="status" aria-live="polite">
      <div className="app-loading__ring" aria-hidden="true" />
      <div>{label}</div>
    </div>
  );
}