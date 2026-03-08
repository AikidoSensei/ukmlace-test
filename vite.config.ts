import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { notionApiPlugin } from "./vite-notion-api";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), notionApiPlugin(env)],
  };
});
