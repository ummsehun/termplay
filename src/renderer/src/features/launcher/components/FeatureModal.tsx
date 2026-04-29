import React from 'react';
import { useUIStore } from '../../../shared/stores/uiStore';
import { ModalShell } from './ModalShell';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';
import { LauncherConfigPanel } from './LauncherConfigPanel';
import { LibraryPanel } from './LibraryPanel';
import { AssetsPanel } from './AssetsPanel';
import { GuidePanel } from './GuidePanel';

export type FeatureModalType = 'settings' | 'launcher' | 'library' | 'assets' | 'guide';

const MODAL_COMPONENTS: Record<FeatureModalType, React.ComponentType> = {
  settings: GlobalSettingsPanel,
  launcher: LauncherConfigPanel,
  library: LibraryPanel,
  assets: AssetsPanel,
  guide: GuidePanel,
};

export const FeatureModal: React.FC = () => {
  const { activeModal, closeModal } = useUIStore();

  if (!activeModal) return null;

  const Content = MODAL_COMPONENTS[activeModal as FeatureModalType];
  
  if (!Content) return null;

  return (
    <ModalShell onClose={closeModal}>
      <Content />
    </ModalShell>
  );
};
