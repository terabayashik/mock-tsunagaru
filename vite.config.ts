import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/mock-tsunagaru/" : "/",
  plugins: [reactRouter(), tsconfigPaths()],
  define: {
    'process.env.BUILD_DATE': JSON.stringify(process.env.BUILD_DATE || new Date().toISOString()),
  },
});
