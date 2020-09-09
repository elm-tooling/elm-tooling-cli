import * as fs from "fs";
import * as path from "path";

const DIR = __dirname;
const BUILD = path.join(DIR, "build");

function modifyFile(
  file: string,
  transform: (content: string) => string
): void {
  fs.writeFileSync(file, transform(fs.readFileSync(file, "utf8")));
}

fs.unlinkSync(path.join(BUILD, "build.js"));
fs.unlinkSync(path.join(BUILD, "build-post.js"));

modifyFile(path.join(BUILD, "index.js"), (content) =>
  content.replace(/^exports.default =/m, "module.exports =")
);
