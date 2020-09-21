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
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/"],
  coverageThreshold: {
    global: process.platform === "win32" ? ignoreCoverage : requireCoverage,
    // Download is exercised in `scripts/test-all-downloads.ts`.
    // Testing error handling is still manual, though.
    "./commands/download.ts": ignoreCoverage,
    // Windows-only code.
    "./helpers/symlink-shim-windows.ts": ignoreCoverage,
  },
};
