import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },
  define: {
    __VUE_OPTIONS_API__: "true",
    __VUE_PROD_DEVTOOLS__: "false",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["test/cases.spec.ts", "test/runtime.spec.ts", "test/validation.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["test/runtime.browser.spec.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
        },
      },
    ],
  },
});
