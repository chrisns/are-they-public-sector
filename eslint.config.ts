import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
  tseslint.configs.recommended,
  // Browser files configuration
  {
    files: ["website/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        Fuse: "readonly",
        Alpine: "readonly",
        Chart: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-undef": "off"
    }
  },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["package-lock.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"], rules: { "json/no-empty-keys": "off" } },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/gfm", extends: ["markdown/recommended"] },
  globalIgnores(["dist", "node_modules", "coverage", "specs", ".specify", ".claude", ".cache", "test/*.js", "website/**"])
]);
