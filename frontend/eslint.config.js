import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" } },
    plugins: { "@typescript-eslint": tseslint, "react-hooks": reactHooks },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

