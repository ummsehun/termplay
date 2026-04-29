export const IPC_CHANNELS = {
  launchGame: 'game:launch',
  gameStatusChanged: 'game:status-changed',
  launcher: {
    selectInstallPath: 'launcher:select-install-path',
    getInstallPath: 'launcher:get-install-path',
    setInstallPath: 'launcher:set-install-path',
    getDirSummary: 'launcher:get-dir-summary',
    openLibraryDir: 'launcher:open-library-dir',
    getSettings: 'launcher:get-settings',
    setSeriesOption: 'launcher:set-series-option',
    setGlobalOption: 'launcher:set-global-option',
    getAssetList: 'launcher:get-asset-list',
    downloadAsset: 'launcher:download-asset',
    cancelDownload: 'launcher:cancel-download',
    onDownloadProgress: 'launcher:on-download-progress',
  }
} as const;
