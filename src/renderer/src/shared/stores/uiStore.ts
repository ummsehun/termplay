import { create } from 'zustand';

export type ModalType = 'settings' | 'launcher' | 'library' | 'assets' | 'guide' | null;

type UIState = {
  isSettingsOpen: boolean; // Legacy/convenience
  activeModal: ModalType;
  openSettings: () => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  activeModal: null,
  openSettings: () => set({ activeModal: 'settings', isSettingsOpen: true }),
  openModal: (modal) => set({ activeModal: modal, isSettingsOpen: modal === 'settings' }),
  closeModal: () => set({ activeModal: null, isSettingsOpen: false }),
}));
