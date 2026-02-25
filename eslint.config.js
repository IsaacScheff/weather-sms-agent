import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module"
    },
    plugins: {
      import: importPlugin,
      unicorn
    },
    rules: {
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
