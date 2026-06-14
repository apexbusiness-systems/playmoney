import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
  const { nitro } = await import("nitro/vite");

  return {
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
      }),
      react(),
      nitro({
        preset: "cloudflare-module",
        cloudflare: {
          nodeCompat: true,
        },
      }),
    ],
  };
});
