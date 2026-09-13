import simpleImportSort from "eslint-plugin-simple-import-sort";

export const importSortConfig = {
  plugins: {
    "simple-import-sort": simpleImportSort,
  },
  rules: {
    "simple-import-sort/imports": [
      "error",
      {
        groups: [
          // Side-effect imports.
          ["^\\u0000"],
          // Node.js built-ins.
          ["^node:"],
          // External packages.
          ["^react$", "^react-dom$", "^@?\\w"],
          // Monorepo internal aliases.
          ["^@repo(/.*|$)"],
          // Internal aliases.
          ["^#/"],
          // Parent imports.
          ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
          // Same-folder imports.
          ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
          // Style imports.
          ["^.+\\.css$"],
        ],
      },
    ],
    "simple-import-sort/exports": "error",
  },
};
