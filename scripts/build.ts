import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";

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
  { src: "index.d.ts" },
  { src: "getExecutable.d.ts" },
  { src: "package-real.json", dest: "package.json" },
  { src: "README-npm.md", dest: "README.md" },
];

if (fs.existsSync(BUILD)) {
  rimraf.sync(BUILD);
}

fs.mkdirSync(BUILD);

for (const { src, dest = src } of FILES_TO_COPY) {
  fs.copyFileSync(path.join(DIR, src), path.join(BUILD, dest));
}

childProcess.spawnSync("npx", ["--no-install", "tsc"], {
  shell: true,
  stdio: "inherit",
});

function modifyFile(
  file: string,
  transform: (content: string) => string
): void {
  fs.writeFileSync(file, transform(fs.readFileSync(file, "utf8")));
}

function adjustDefaultExport(content: string): string {
  return content.replace(/^exports.default =/m, "module.exports =");
}

modifyFile(path.join(BUILD, "index.js"), adjustDefaultExport);
modifyFile(path.join(BUILD, "getExecutable.js"), adjustDefaultExport);
modifyFile(path.join(BUILD, "commands", "help.js"), (content) =>
  content.replace(/%VERSION%/g, PKG.version)
);

fs.chmodSync(path.join(BUILD, "index.js"), "755");

modifyFile(path.join(DIR, "docs", "getting-started.md"), (content) =>
  content.replace(/("elm-tooling":\s*)"[^"]+"/g, `$1"${PKG.version}"`)
);
