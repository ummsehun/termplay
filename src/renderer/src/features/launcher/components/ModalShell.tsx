import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ModalShellProps = {
  onClose: () => void;
  children: React.ReactNode;
};

export const ModalShell: React.FC<ModalShellProps> = ({ onClose, children }) => {
  const { t } = useTranslation();
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-8 sm:p-12 md:p-16 lg:p-24"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full h-full max-w-5xl max-h-[750px] bg-[#111111] border border-white/5 rounded-[20px] shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#2c2c2e] hover:bg-[#3c3c3e] flex items-center justify-center text-white/70 hover:text-white transition-colors z-50"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        {children}
      </div>
    </div>
  );
};
