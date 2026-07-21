import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const directory = dirname(filename);

const compat = new FlatCompat({
  baseDirectory: directory,
});

export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
];
