module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
    "prettier/@typescript-eslint",
  ],
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
      files: "*.test.ts",
      extends: ["plugin:jest/recommended", "plugin:jest/style"],
    },
  ],
};
