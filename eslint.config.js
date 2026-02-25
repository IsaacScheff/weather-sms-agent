import globals from "globals";
import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.browser
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      unicorn
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "import/first": "error",
      "import/no-duplicates": "error",
      "unicorn/prefer-module": "off",
      "unicorn/prevent-abbreviations": "off",
      "no-console": "off"
    }
  },
  {
    ignores: ["dist/**", "node_modules/**"]
  }
];