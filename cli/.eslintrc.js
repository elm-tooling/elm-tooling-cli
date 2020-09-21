const baseExtends = [
  "eslint:recommended",
  "plugin:@typescript-eslint/recommended",
  "plugin:@typescript-eslint/recommended-requiring-type-checking",
  "prettier",
  "prettier/@typescript-eslint",
];

module.exports = {
  root: true,
  extends: baseExtends,
  plugins: ["@typescript-eslint", "simple-import-sort", "jest"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  env: {
    es2020: true,
    node: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    curly: "error",
    "no-console": "error",
    "no-fallthrough": "off",
    "simple-import-sort/sort": "error",
  },
  overrides: [
    {
      files: "scripts/**/*.ts",
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./scripts/tsconfig.json"],
      },
    },
    {
      files: "tests/**/*.ts",
      extends: [...baseExtends, "plugin:jest/recommended", "plugin:jest/style"],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tests/tsconfig.json"],
      },
    },
  ],
};
