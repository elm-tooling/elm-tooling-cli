import typescript from "@rollup/plugin-typescript";
import * as fs from "fs";
import { builtinModules } from "module";
import * as path from "path";
import * as rimraf from "rimraf";
import { rollup } from "rollup";

const DIR = path.dirname(__dirname);
const BUILD = path.join(DIR, "build");

type Package = {
  version: string;
};

const PKG = JSON.parse(
  fs.readFileSync(path.join(DIR, "package-real.json"), "utf8")
) as Package;

type FileToCopy = {
  src: string;
  dest?: string;
  transformSrc?: (content: string) => string;
  transformDest?: (content: string) => string;
};

const FILES_TO_COPY: Array<FileToCopy> = [
  { src: "LICENSE" },
  { src: "src/index.d.ts", dest: "index.d.ts" },
  { src: "src/getExecutable.d.ts", dest: "getExecutable.d.ts" },
  { src: "package-real.json", dest: "package.json" },
  { src: "README.md" },
];

function modifyFile(
  file: string,
  transform: (content: string) => string
): void {
  fs.writeFileSync(file, transform(fs.readFileSync(file, "utf8")));
}

async function run(): Promise<void> {
  if (fs.existsSync(BUILD)) {
    rimraf.sync(BUILD);
  }

  fs.mkdirSync(BUILD);

  for (const { src, dest = src } of FILES_TO_COPY) {
    fs.copyFileSync(path.join(DIR, src), path.join(BUILD, dest));
  }

  const entry = path.join(DIR, "src", "RollupEntry.ts");

  const bundle = await rollup({
    input: entry,
    external: builtinModules,
    plugins: [typescript({ module: "ESNext" })],
    onwarn: (warning) => {
      // Rollup warnings _do_ have a real `.toString()` method.
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new Error(warning.toString());
    },
  });

  const { output } = await bundle.generate({
    format: "cjs",
    hoistTransitiveImports: false,
    chunkFileNames: "[name].js",
    interop: "esModule",
  });

  for (const item of output) {
    switch (item.type) {
      case "asset":
        throw new Error(`Unexpectedly got an "asset".`);

      case "chunk":
        if (item.facadeModuleId !== entry) {
          const isIndex = item.name === "index";
          const code = item.code
            .replace(/%VERSION%/g, PKG.version)
            .replace(
              /^exports(?:\.default|\[(['"])default\1\]) =/m,
              "module.exports ="
            );
          const fullCode = isIndex ? `#!/usr/bin/env node\n${code}` : code;
          fs.writeFileSync(
            path.join(BUILD, item.fileName),
            fullCode,
            isIndex ? { mode: "755" } : {}
          );
        }
    }
  }

  modifyFile(path.join(DIR, "docs", "getting-started.md"), (content) =>
    content.replace(/("elm-tooling":\s*)"[^"]+"/g, `$1"${PKG.version}"`)
  );
}

run().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
