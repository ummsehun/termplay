import React from 'react';
import { SectionHeader } from '../../../shared/components/SectionHeader';

export const SeriesSettingsPanel: React.FC = () => {
  return (
    <div className="p-8">
      <SectionHeader title="Launcher Settings" description="Configure global launcher preferences." />

      <div className="max-w-2xl space-y-8">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-launcher-text">Installation</h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-launcher-textMuted">Default Install Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value="C:\Program Files\Lanchaer"
                className="flex-1 bg-launcher-surface border border-launcher-border rounded-control px-4 py-2 text-sm text-launcher-textMuted font-mono outline-none focus:border-launcher-primary transition-colors"
              />
              <button disabled className="px-4 py-2 bg-launcher-surfaceElevated border border-launcher-border rounded-control text-sm font-medium disabled:opacity-50 transition-colors">
                Browse
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-launcher-text">Preferences</h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-not-allowed opacity-70">
              <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-launcher-border bg-launcher-surface text-launcher-accent focus:ring-launcher-accent/50" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Auto-check for updates</span>
                <span className="text-xs text-launcher-textMuted">Check for updates on application launch</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-not-allowed opacity-70">
              <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-launcher-border bg-launcher-surface text-launcher-accent focus:ring-launcher-accent/50" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Remember last project</span>
                <span className="text-xs text-launcher-textMuted">Automatically select the last viewed project on startup</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-launcher-border/50">
          <p className="text-xs text-launcher-textMuted">
            Note: Settings are purely UI mockups in this version.
          </p>
        </div>
      </div>
    </div>
  );
};
