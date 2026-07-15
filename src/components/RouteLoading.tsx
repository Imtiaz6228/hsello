export function RouteLoading() {
  return (
    <main className="route-loading" aria-busy="true" aria-label="Loading page">
      <div className="route-loading-bar" />
      <div className="route-loading-shell">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
