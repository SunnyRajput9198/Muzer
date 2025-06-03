// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc"; // Correct import for FlatCompat

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  // Other options if needed, e.g., cwd: process.cwd()
});

// The base configurations from 'next' plugins.
// This will return an array of config objects.
const nextBaseConfigs = compat.extends("next/core-web-vitals", "next/typescript");

// Combine all configurations into a single array
const eslintConfig = [
  ...nextBaseConfigs, // Spread the configs from 'next/core-web-vitals' and 'next/typescript'
  {
    // This object defines additional rules or overrides for the entire project
    rules: {
      // Your custom rules here
      // For example, from your previous .eslintrc:
      "react-hooks/exhaustive-deps": "off",
      // And the new one you wanted to add:
      "@typescript-eslint/no-explicit-any": "off",
      // ... any other custom rules
    },
    // If these rules should only apply to specific files, you can use 'files'
    // files: ["**/*.{js,jsx,ts,tsx}"]
  },
  // You can add more config objects here for specific scenarios (e.g., test files)
];

// Export the combined configuration array as the default export
export default eslintConfig;