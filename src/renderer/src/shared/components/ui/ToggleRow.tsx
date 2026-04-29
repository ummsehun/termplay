import React from 'react';

export type ToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onCheckedChange,
  disabled
}) => (
  <div className="flex items-center justify-between p-5 rounded-xl border border-white/5 bg-[#1c1c1e]">
    <div className="flex flex-col pr-6">
      <span className="text-[15px] font-bold text-white/90">{label}</span>
      {description && <span className="text-[13px] text-white/50 mt-1">{description}</span>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-[#333] rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
      <div className="absolute left-[3px] top-[3px] bg-white w-[18px] h-[18px] rounded-full transition-transform peer-checked:translate-x-5"></div>
    </label>
  </div>
);
