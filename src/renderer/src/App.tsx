import { LauncherPage } from './pages/launcher/LauncherPage';
import { FeatureModal } from './features/launcher/components/FeatureModal';
import './shared/styles/globals.css';
import './shared/i18n/config';

function App() {
  return (
    <>
      <LauncherPage />
      <FeatureModal />
    </>
  );
}

export default App;
