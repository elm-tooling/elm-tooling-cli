// @ts-check

import typescript from "@rollup/plugin-typescript";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "src/RollupEntry.ts",
  output: {
    dir: "output",
    format: "cjs",
    chunkFileNames: "[name].js",
    hoistTransitiveImports: false,
  },
  plugins: [typescript()],
  external: require("module").builtinModules,
  onwarn: /** @type {(warning: import("rollup").RollupWarning) => never} */ (
    warning
  ) => {
    throw warning;
  },
};

export default config;
