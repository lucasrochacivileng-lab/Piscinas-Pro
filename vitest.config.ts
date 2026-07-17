import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@poolstruct/calculation-engine": fileURLToPath(new URL("./packages/calculation-engine/src/index.ts", import.meta.url))
    }
  },
  test: {
    coverage: { reporter: ["text", "html"] },
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "supabase/**/*.test.ts"]
  }
});
