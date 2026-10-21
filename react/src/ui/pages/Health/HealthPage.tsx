import { useEffect } from 'react';
import { usePortfolioStore } from '../../../app/PortfolioStore';
import { resolveBasename } from '../../../adapters/basePath';

const PAGE_LOADED = new Date(performance.timeOrigin).toISOString();

/** Page-level health view (factory/standards/health-check.md), outside the shell. This app has no
 *  backend, so there is no API section: the page loading shows the static bundle is served, and the
 *  dataset line shows the JSON source validated. */
export function HealthPage() {
  const { load } = usePortfolioStore();
  useEffect(() => { document.title = 'Health · Portfolio Command Center'; }, []);
  return (
    <main className="healthz" aria-labelledby="healthz-title">
      <h1 id="healthz-title">Health</h1>
      <dl>
        <dt>Status</dt><dd data-testid="health-status" className={load.ok ? 'tone-success' : 'tone-danger'}>{load.ok ? 'ok' : 'degraded'}</dd>
        <dt>App</dt><dd data-testid="health-app">{__APP_NAME__}</dd>
        <dt>Version</dt><dd data-testid="health-version">{__APP_VERSION__}</dd>
        <dt>Built</dt><dd>{__BUILD_TIME__}</dd>
        <dt>Page loaded</dt><dd>{PAGE_LOADED}</dd>
        <dt>Base path</dt><dd>{resolveBasename()}</dd>
        <dt>Data source</dt><dd>json (no backend)</dd>
        <dt>Fixture version</dt><dd>{load.ok ? load.dataset.fixtureVersion : 'not loaded'}</dd>
        <dt>Projects</dt><dd>{load.ok ? load.dataset.projects.length : 0}</dd>
        {!load.ok && (<><dt>Dataset errors</dt><dd>{load.errors.join(' ')}</dd></>)}
      </dl>
    </main>
  );
}