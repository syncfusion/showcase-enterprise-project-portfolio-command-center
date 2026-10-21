import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Shell } from './Shell';
import { FiltersProvider } from './filters';
import { AppLoading } from './components/AppLoading';
import { useTheme } from './theme';
import { HealthPage } from './pages/Health/HealthPage';

// Pages load on demand so no route downloads another's Syncfusion bundles.
const ScorecardPage = lazy(() => import('./pages/Scorecard/ScorecardPage').then((m) => ({ default: m.ScorecardPage })));
const RegisterPage = lazy(() => import('./pages/Register/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const CapacityPage = lazy(() => import('./pages/Capacity/CapacityPage').then((m) => ({ default: m.CapacityPage })));
const RiskDependenciesPage = lazy(() => import('./pages/RiskDependencies/RiskDependenciesPage').then((m) => ({ default: m.RiskDependenciesPage })));
const MilestonesPage = lazy(() => import('./pages/Milestones/MilestonesPage').then((m) => ({ default: m.MilestonesPage })));

const page = (name: string, el: ReactNode) => <Suspense fallback={<AppLoading label={`Loading ${name}…`} />}>{el}</Suspense>;

export function App() {
  const { ready } = useTheme();
  const { pathname } = useLocation();
  // Frame-first startup: the shell mounts under #app-boot and takes over once the theme has loaded.
  useEffect(() => { if (ready || pathname === '/healthz') document.getElementById('app-boot')?.remove(); }, [ready, pathname]);
  return (
    <>
      {/* Startup screen until the Syncfusion theme has loaded; the shell mounts underneath so page code downloads meanwhile. */}
      {!ready && pathname !== '/healthz' && <AppLoading variant="screen" label="Loading Portfolio Command Center…" />}
      <Routes>
        {/* Standalone status page, outside the shell (factory/standards/health-check.md). */}
        <Route path="/healthz" element={<HealthPage />} />
        <Route element={<FiltersProvider><Shell /></FiltersProvider>}>
          <Route index element={<Navigate to="/scorecard" replace />} />
          <Route path="/scorecard" element={page('Executive Scorecard', <ScorecardPage />)} />
          <Route path="/register" element={page('Portfolio Register', <RegisterPage />)} />
          <Route path="/capacity" element={page('Resource Capacity', <CapacityPage />)} />
          <Route path="/risk-dependencies" element={page('Risks & Dependencies', <RiskDependenciesPage />)} />
          <Route path="/milestones" element={page('Milestones & Timeline', <MilestonesPage />)} />
          <Route path="*" element={<Navigate to="/scorecard" replace />} />
        </Route>
      </Routes>
    </>
  );
}