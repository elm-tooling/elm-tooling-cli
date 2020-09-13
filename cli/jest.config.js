module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Download is exercised in `scripts/test-all-downloads.ts`.
    // Testing error handling is still manual, though.
    "./commands/download.ts": {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1,
    },
    // TODO: Remove this once more tests written.
    "./commands/postinstall.ts": {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1,
    },
  },
};
