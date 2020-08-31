import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

import type { ElmTooling, NonEmptyArray } from "../helpers/definition";
import { tools } from "../helpers/tools";

export default async function init(): Promise<number> {
  if (fs.existsSync("elm-tooling.json")) {
    process.stderr.write("elm-tooling.json already exists!\n");
    return 1;
  }

  const json: ElmTooling = {
    // TODO: Should exclude entrypoints if package.
    entrypoints: await tryGuessEntrypoints().catch(
      (): NonEmptyArray<string> => ["./src/Main.elm"]
    ),
    binaries: Object.fromEntries(
      Object.keys(tools)
        .sort()
        .map((name) => {
          const versions = Object.keys(tools[name]);
          return [name, versions[versions.length - 1]];
        })
    ),
  };

  fs.writeFileSync("elm-tooling.json", JSON.stringify(json, null, 2));
  process.stderr.write(
    "Created a sample elm-tooling.json\nEdit it as needed!\n"
  );
  return 0;
}

async function tryGuessEntrypoints(): Promise<NonEmptyArray<string>> {
  const files = tryGetSourceDirectories().flatMap((directory) =>
    fs
      .readdirSync(directory, { encoding: "utf-8", withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".elm"))
      .map((entry) => path.join(directory, entry.name))
  );

  const results = await Promise.allSettled(files.map(isMainFile));
  const entrypoints = results
    .flatMap((result) => {
      switch (result.status) {
        case "fulfilled":
          return result.value ?? [];
        case "rejected":
          return [];
      }
    })
    .sort();

  if (entrypoints.length === 0) {
    throw new Error("Expected at least 1 entrypoint but got 0.");
  }

  return [entrypoints[0], ...entrypoints.slice(1)];
}

function tryGetSourceDirectories(): NonEmptyArray<string> {
  const elmJson: unknown = JSON.parse(fs.readFileSync("elm.json", "utf8"));

  if (!isObject(elmJson)) {
    throw new Error(
      `Expected elm.json to be a JSON object but got: ${JSON.stringify(
        elmJson
      )}`
    );
  }

  switch (elmJson.type) {
    case "application": {
      if (!Array.isArray(elmJson["source-directories"])) {
        throw new Error(
          `Expected "source-directories" to be an array but got: ${JSON.stringify(
            elmJson["source-directories"]
          )}`
        );
      }
      const directories = elmJson["source-directories"].flatMap((item) =>
        typeof item === "string" ? item : []
      );
      if (directories.length === 0) {
        throw new Error(
          `Expected "source-directories" to contain at least of string but got: ${JSON.stringify(
            elmJson["source-directories"]
          )}`
        );
      }
      return [directories[0], ...directories.slice(1)];
    }

    case "package":
      return ["src"];

    default:
      throw new Error(
        `Expected "type" to be "application" or "package" but got: ${JSON.stringify(
          elmJson.type
        )}`
      );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMainFile(file: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    let found = false;
    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      if (/^main *=/.test(line)) {
        found = true;
        rl.close();
      }
    });

    rl.once("close", () => {
      resolve(found ? file : undefined);
    });
  });
}
