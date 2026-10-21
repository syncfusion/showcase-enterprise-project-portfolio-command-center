import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import startupPreload from './vite/startup-preload.mjs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { name: string; version: string };

// Public base path per factory/standards/publishing-base-path.md
export const publicBasePath = '/enterprise-project-portfolio-command-center/react';

export default defineConfig({
  base: `${publicBasePath}/`,
  plugins: [
    react(),
    tailwindcss(),
    // Preloads the chosen theme stylesheet and the opened route's page chunk + imports from the HTML.
    startupPreload({
      base: `${publicBasePath}/`,
      routes: {
        scorecard: 'src/ui/pages/Scorecard/ScorecardPage.tsx',
        register: 'src/ui/pages/Register/RegisterPage.tsx',
        capacity: 'src/ui/pages/Capacity/CapacityPage.tsx',
        'risk-dependencies': 'src/ui/pages/RiskDependencies/RiskDependenciesPage.tsx',
        milestones: 'src/ui/pages/Milestones/MilestonesPage.tsx',
      },
      defaultRoute: 'scorecard',
      themes: { light: /styles\/syncfusion\/tailwind\.css$/, dark: /styles\/syncfusion\/tailwind\.css$/ },
    }),
  ],
  define: {
    __APP_NAME__: JSON.stringify(pkg.name),
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});