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
      files: "*.test.ts",
      extends: [...baseExtends, "plugin:jest/recommended", "plugin:jest/style"],
    },
  ],
};
