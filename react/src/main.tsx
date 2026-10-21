import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// Transitive through every @syncfusion/ej2-react-* package; never add ej2-base to package.json
// (factory/standards/syncfusion-component-skills.json, knownCorrections).
import { registerLicense } from '@syncfusion/ej2-base';
import './styles/app.css';
import { resolveBasename } from './adapters/basePath';
import { loadDataset } from './adapters/dataset';
import { PortfolioStoreProvider } from './app/PortfolioStore';
import { ThemeProvider } from './ui/theme';
import { App } from './ui/App';

const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
if (licenseKey) registerLicense(licenseKey);

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <PortfolioStoreProvider load={loadDataset()}>
      <BrowserRouter basename={resolveBasename()}>
        <App />
      </BrowserRouter>
    </PortfolioStoreProvider>
  </ThemeProvider>,
);