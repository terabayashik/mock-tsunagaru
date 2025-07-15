import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/mock-tsunagaru/",
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    {
      name: "copy-index-to-404",
      writeBundle(options) {
        const buildPath = options.dir || "./build/client";
        // index.html を 404.html にもコピー
        try {
          copyFileSync(join(buildPath, "index.html"), join(buildPath, "404.html"));
        } catch (error) {
          console.warn("404.html copy failed:", error);
        }
      },
    },
  ],
});
