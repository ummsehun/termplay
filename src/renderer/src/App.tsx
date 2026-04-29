import { useEffect } from 'react';
import { LauncherPage } from './pages/launcher/LauncherPage';
import { FeatureModal } from './features/launcher/components/FeatureModal';
import { useLauncherConfigStore } from './features/launcher/stores/launcherConfigStore';
import './shared/styles/globals.css';
import './shared/i18n/config';

function App() {
  useEffect(() => {
    useLauncherConfigStore.getState().load();
  }, []);

  return (
    <>
      <LauncherPage />
      <FeatureModal />
    </>
  );
}

export default App;
