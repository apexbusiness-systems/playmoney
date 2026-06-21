import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

function assertProductionSupabaseBuildConfig(): void {
  if (process.env.VITE_PLAYMONEY_REQUIRE_SUPABASE_CONFIG !== "true") return;

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Production deploy build requires VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY; refusing to build with MockApiClient fallback.",
    );
  }
}

export default defineConfig(async () => {
  assertProductionSupabaseBuildConfig();

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
