import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

import { KNOWN_TOOLS } from "../helpers/known_tools";
import { bold, ElmTooling, isRecord, NonEmptyArray } from "../helpers/mixed";
import { getOSName } from "../helpers/parse";

export default async function init(): Promise<number> {
  const absolutePath = path.resolve("elm-tooling.json");

  if (fs.existsSync(absolutePath)) {
    console.error(bold(absolutePath));
    console.error("Already exists!");
    return 1;
  }

  // For packages, skip entrypoints.
  // For applications, try to find .elm files with `main =` directly inside one
  // of the "source-directories".
  // If all detection fails, use a good guess.
  const entrypoints = await tryGuessEntrypoints().catch(() => [
    "./src/Main.elm",
  ]);

  const tools =
    getOSName() instanceof Error
      ? undefined
      : Object.fromEntries(
          Object.keys(KNOWN_TOOLS)
            .sort()
            .map((name) => {
              const versions = Object.keys(KNOWN_TOOLS[name]);
              return [name, versions[versions.length - 1]];
            })
        );

  const json: ElmTooling = {
    entrypoints:
      entrypoints.length === 0
        ? undefined
        : (entrypoints as NonEmptyArray<string>),
    tools: tools,
  };

  fs.writeFileSync("elm-tooling.json", JSON.stringify(json, null, 2));
  console.log(bold(absolutePath));
  console.log("Created! Open it in a text editor and have a look!");
  return 0;
}

async function tryGuessEntrypoints(): Promise<Array<string>> {
  const sourceDirectories = tryGetSourceDirectories();
  if (sourceDirectories.length === 0) {
    return [];
  }

  const files = sourceDirectories.flatMap((directory) =>
    fs
      .readdirSync(directory, { encoding: "utf-8", withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".elm"))
      .map((entry) => path.join(directory, entry.name))
  );

  const results = await Promise.all(
    files.map((file) =>
      isMainFile(file).then(
        (isMain) => (isMain ? file : new Error(`${file} is not a main file.`)),
        (error: Error) => error
      )
    )
  );
  const entrypoints = results
    .flatMap((result) => (result instanceof Error ? [] : result))
    .sort();

  if (entrypoints.length === 0) {
    throw new Error("Expected at least 1 entrypoint but got 0.");
  }

  return entrypoints;
}

function tryGetSourceDirectories(): Array<string> {
  const elmJson: unknown = JSON.parse(fs.readFileSync("elm.json", "utf8"));

  if (!isRecord(elmJson)) {
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
      return directories as NonEmptyArray<string>;
    }

    case "package":
      return [];

    default:
      throw new Error(
        `Expected "type" to be "application" or "package" but got: ${JSON.stringify(
          elmJson.type
        )}`
      );
  }
}

function isMainFile(file: string): Promise<boolean> {
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
      resolve(found);
    });
  });
}
