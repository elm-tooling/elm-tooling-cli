import * as fs from "fs";
import * as path from "path";

const DIR = path.dirname(__dirname);
const BUILD = path.join(DIR, "build");

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
modifyFile(path.join(BUILD, "ensure.js"), adjustDefaultExport);

fs.chmodSync(path.join(BUILD, "index.js"), "755");
