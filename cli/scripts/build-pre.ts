import * as fs from "fs";
import * as path from "path";

const DIR = path.dirname(__dirname);
const BUILD = path.join(DIR, "build");

const READ_MORE =
  "**[➡️ Full readme](https://github.com/lydell/elm-tooling.json/tree/master/cli)**";

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
  { src: "package-real.json", dest: "package.json" },
  {
    src: "README.md",
    transformSrc: (content) =>
      content.replace(/("elm-tooling":\s*)"[^"]+"/g, `$1"${PKG.version}"`),
    transformDest: (content) => content.replace(/<!--[^]*$/, READ_MORE),
  },
];

if (fs.existsSync(BUILD)) {
  fs.rmdirSync(BUILD, { recursive: true });
}

fs.mkdirSync(BUILD);

for (const { src, dest = src, transformSrc, transformDest } of FILES_TO_COPY) {
  if (transformSrc !== undefined) {
    fs.writeFileSync(
      path.join(DIR, src),
      transformSrc(fs.readFileSync(path.join(DIR, src), "utf8"))
    );
  }
  if (transformDest !== undefined) {
    fs.writeFileSync(
      path.join(BUILD, dest),
      transformDest(fs.readFileSync(path.join(DIR, src), "utf8"))
    );
  } else {
    fs.copyFileSync(path.join(DIR, src), path.join(BUILD, dest));
  }
}
