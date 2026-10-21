import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, ListChecks, Users, AlertTriangle, CalendarRange, BarChart3, type LucideIcon } from 'lucide-react';
import { AppShell, type NavItem } from './shell/AppShell';
import { usePortfolioStore } from '../app/PortfolioStore';
import { useTheme } from './theme';
import { ButtonComponent, SwitchComponent } from '@syncfusion/ej2-react-buttons';
import { Moon, Sun } from 'lucide-react';

const ITEMS: Array<NavItem & { icon: LucideIcon }> = [
  { id: 'scorecard', label: 'Executive Scorecard', href: '/scorecard', icon: LayoutDashboard },
  { id: 'register', label: 'Portfolio Register', href: '/register', icon: ListChecks },
  { id: 'capacity', label: 'Resource Capacity', href: '/capacity', icon: Users },
  { id: 'risk-dependencies', label: 'Risks & Dependencies', href: '/risk-dependencies', icon: AlertTriangle },
  { id: 'milestones', label: 'Milestones & Timeline', href: '/milestones', icon: CalendarRange },
];

export function currentNavId(pathname: string): string {
  // hrefs are root-relative ("href: '/register'"), so match on them directly.
  const match = ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return match?.id ?? 'scorecard';
}

export function Shell() {
  const navigate = useNavigate();
  // Reactive route: useLocation re-renders the shell on navigation so the sidebar
  // highlight follows the page (window.location.pathname would stay stale).
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const { editCount, profile, setProfile, reset } = usePortfolioStore();
  const currentId = useMemo(() => currentNavId(pathname), [pathname]);

  const onNavigate = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    const item = ITEMS.find((i) => i.id === id);
    if (item) { event.preventDefault(); navigate(item.href); }
  };

  return (
    <AppShell
      appName="Portfolio Command Center"
      appSubtitle="Northwind Enterprises"
      logo={<BarChart3 size={20} aria-hidden="true" />}
      items={ITEMS}
      currentId={currentId}
      onNavigate={onNavigate}
      storageKey="enterprise-project-portfolio-command-center-nav-collapsed"
      headerEnd={
        <>
          <span className="remember-edits" title="On: your stage changes are saved in this browser and survive a reload until you press Reset. Off: changes last until you reload.">
            <SwitchComponent id="eppcc-remember" checked={profile === 'customer'}
              change={(args) => setProfile(args.checked ? 'customer' : 'public')} />
            <label htmlFor="eppcc-remember">Remember my edits</label>
          </span>
          <ButtonComponent
            cssClass="e-outline"
            disabled={editCount === 0}
            onClick={() => { reset(); }}
            aria-label="Reset session edits"
            title="Discard this session's edits and return to the shipped baseline"
          >
            Reset ({editCount})
          </ButtonComponent>
          <button type="button" className="app-shell-icon-button" onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </>
      }
      footer={<span>Demo data · demo-today 2026-10-16</span>}
    >
      <Outlet />
    </AppShell>
  );
}