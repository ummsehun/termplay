// electron-vite.config.ts
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "electron-vite";
var __electron_vite_injected_dirname = "/Users/user/termplay";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ["electron"],
        input: resolve(__electron_vite_injected_dirname, "src/main/index.ts"),
        output: {
          format: "es"
        }
      }
    },
    resolve: {
      alias: {
        "@shared": resolve(__electron_vite_injected_dirname, "src/shared")
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__electron_vite_injected_dirname, "src/main/preload.ts"),
        formats: ["es"],
        fileName: () => "index.js"
      },
      rollupOptions: {
        external: ["electron"]
      }
    }
  },
  renderer: {
    root: resolve(__electron_vite_injected_dirname, "src/renderer"),
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@renderer": resolve(__electron_vite_injected_dirname, "src/renderer/src"),
        "@shared": resolve(__electron_vite_injected_dirname, "src/shared")
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
