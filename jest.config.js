const requireCoverage = {
  branches: 100,
  functions: 100,
  lines: 100,
  statements: 100,
};

const ignoreCoverage = {
  branches: 0,
  functions: 0,
  lines: 0,
  statements: 0,
};

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.ts"],
  coverageThreshold: {
    global: process.platform === "win32" ? ignoreCoverage : requireCoverage,
    // Download is exercised in `scripts/test-all-downloads.ts`.
    // The linking stuff gets coverage since it’s in `src/link.ts`.
    // Testing error handling is still manual, though.
    // We still get 40-50% coverage at least.
    "./src/commands/install.ts": ignoreCoverage,
  },
};
