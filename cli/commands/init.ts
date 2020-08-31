import * as fs from "fs";

import type { ElmTooling } from "../helpers/definition";
import { tools } from "../helpers/tools";

export default function init(): void {
  if (fs.existsSync("elm-tooling.json")) {
    process.stderr.write("elm-tooling.json already exists!\n");
    process.exit(1);
  }

  const json: ElmTooling = {
    entrypoints: ["./src/Main.elm"],
    binaries: Object.fromEntries(
      Object.keys(tools).map((name) => {
        const versions = Object.keys(tools[name]);
        return [name, versions[versions.length - 1]];
      })
    ),
  };

  fs.writeFileSync("elm-tooling.json", JSON.stringify(json, null, 2));
  process.stderr.write(
    "Created a sample elm-tooling.json\nEdit it as needed!\n"
  );

  process.exit(0);
}
