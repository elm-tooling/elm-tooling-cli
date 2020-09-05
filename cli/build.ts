"use strict";

import * as fs from "fs";
import * as path from "path";

const DIR = __dirname;
const BUILD = path.join(DIR, "build");

type FileToCopy = {
  src: string;
  dest?: string;
  transform?: (content: string) => string;
};

const FILES_TO_COPY: Array<FileToCopy> = [
  { src: "LICENSE" },
  { src: "package-real.json", dest: "package.json" },
  { src: "README.md" },
];

if (fs.existsSync(BUILD)) {
  fs.rmdirSync(BUILD, { recursive: true });
}

fs.mkdirSync(BUILD);

for (const { src, dest = src, transform } of FILES_TO_COPY) {
  if (transform) {
    fs.writeFileSync(
      path.join(BUILD, dest),
      transform(fs.readFileSync(path.join(DIR, src), "utf8"))
    );
  } else {
    fs.copyFileSync(path.join(DIR, src), path.join(BUILD, dest));
  }
}
