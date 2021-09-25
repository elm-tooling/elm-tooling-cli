import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

import {
  bold,
  ElmTooling,
  Env,
  flatMap,
  fromEntries,
  isNonEmptyArray,
  isRecord,
  NonEmptyArray,
  split,
  toJSON,
} from "../Helpers";
import { getLastVersion, KNOWN_TOOLS, KnownToolNames } from "../KnownTools";
import type { Logger } from "../Logger";
import {
  getLatestVersionInRange,
  getOSName,
  getToolThrowing,
  isWindows,
} from "../Parse";
import {
  absoluteDirname,
  AbsolutePath,
  absolutePathFromString,
  Cwd,
  ElmJsonPath,
  ElmToolingJsonPath,
  findClosest,
} from "../PathHelpers";

const DEFAULT_TOOLS: NonEmptyArray<KnownToolNames> = [
  "elm",
  "elm-format",
  "elm-json",
];
DEFAULT_TOOLS.sort((a, b) => a.localeCompare(b));

export async function init(
  cwd: Cwd,
  env: Env,
  logger: Logger
): Promise<number> {
  const elmToolingJsonPath: ElmToolingJsonPath = {
    tag: "ElmToolingJsonPath",
    theElmToolingJsonPath: absolutePathFromString(cwd.path, "elm-tooling.json"),
  };

  if (fs.existsSync(elmToolingJsonPath.theElmToolingJsonPath.absolutePath)) {
    logger.error(bold(elmToolingJsonPath.theElmToolingJsonPath.absolutePath));
    logger.error("Already exists!");
    return 1;
  }

  // For packages, skip entrypoints.
  // For applications, try to find .elm files with `main =` directly inside one
  // of the "source-directories".
  // If all detection fails, use a good guess.
  const entrypoints = await tryGuessEntrypoints(cwd).then(
    (paths) =>
      paths.map((file) => {
        const relative = path.relative(
          path.dirname(elmToolingJsonPath.theElmToolingJsonPath.absolutePath),
          file.absolutePath
        );
        // istanbul ignore next
        const normalized = isWindows ? relative.replace(/\\/g, "/") : relative;
        return `./${normalized}`;
      }),
    () => ["./src/Main.elm"]
  );

  const tools =
    getOSName() instanceof Error
      ? /* istanbul ignore next */ undefined
      : tryGuessToolsFromNodeModules(cwd, env) ??
        fromEntries(DEFAULT_TOOLS.map((name) => [name, getLastVersion(name)]));

  const elmVersionFromElmJson = getElmVersionFromElmJson(cwd);

  const json: ElmTooling = {
    entrypoints: isNonEmptyArray(entrypoints) ? entrypoints : undefined,
    tools:
      elmVersionFromElmJson === undefined
        ? tools
        : { ...tools, elm: elmVersionFromElmJson },
  };

  fs.writeFileSync(
    elmToolingJsonPath.theElmToolingJsonPath.absolutePath,
    toJSON(json)
  );
  logger.log(bold(elmToolingJsonPath.theElmToolingJsonPath.absolutePath));
  logger.log("Created! Open it in a text editor and have a look!");
  logger.log("To install tools: elm-tooling install");
  return 0;
}

async function tryGuessEntrypoints(cwd: Cwd): Promise<Array<AbsolutePath>> {
  const sourceDirectories = tryGetSourceDirectories(cwd);
  if (sourceDirectories.length === 0) {
    return [];
  }

  const files = flatMap(sourceDirectories, (directory) =>
    fs
      .readdirSync(directory.absolutePath, {
        encoding: "utf-8",
        withFileTypes: true,
      })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".elm"))
      .map((entry) => absolutePathFromString(directory, entry.name))
  );

  const results = await Promise.all(
    files.map((file) =>
      isMainFile(file).then(
        (isMain) =>
          isMain ? file : new Error(`${file.absolutePath} is not a main file.`),
        // istanbul ignore next
        (error: Error) => error
      )
    )
  );

  const entrypoints = flatMap(results, (result) =>
    result instanceof Error ? [] : result
  ).sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));

  if (entrypoints.length === 0) {
    throw new Error("Expected at least 1 entrypoint but got 0.");
  }

  return entrypoints;
}

function tryGetElmJson(cwd: Cwd): {
  elmJsonPath: ElmJsonPath;
  elmJson: Record<string, unknown>;
} {
  const elmJsonPath: ElmJsonPath = {
    tag: "ElmJsonPath",
    theElmJsonPath: absolutePathFromString(cwd.path, "elm.json"),
  };
  const elmJson: unknown = JSON.parse(
    fs.readFileSync(elmJsonPath.theElmJsonPath.absolutePath, "utf8")
  );

  if (!isRecord(elmJson)) {
    throw new Error(
      `Expected elm.json to be a JSON object but got: ${JSON.stringify(
        elmJson
      )}`
    );
  }

  return { elmJsonPath, elmJson };
}

function tryGetSourceDirectories(cwd: Cwd): Array<AbsolutePath> {
  const { elmJsonPath, elmJson } = tryGetElmJson(cwd);

  switch (elmJson.type) {
    case "application": {
      if (!Array.isArray(elmJson["source-directories"])) {
        throw new Error(
          `Expected "source-directories" to be an array but got: ${JSON.stringify(
            elmJson["source-directories"]
          )}`
        );
      }
      const directories = flatMap(elmJson["source-directories"], (item) =>
        typeof item === "string"
          ? absolutePathFromString(
              absoluteDirname(elmJsonPath.theElmJsonPath),
              item
            )
          : []
      );
      if (!isNonEmptyArray(directories)) {
        throw new Error(
          `Expected "source-directories" to contain at least one string but got: ${JSON.stringify(
            elmJson["source-directories"]
          )}`
        );
      }
      return directories;
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

async function isMainFile(file: AbsolutePath): Promise<boolean> {
  return new Promise((resolve) => {
    let found = false;
    const rl = readline.createInterface({
      input: fs.createReadStream(file.absolutePath),
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

function tryGuessToolsFromNodeModules(
  cwd: Cwd,
  env: Env
): Record<string, string> | undefined {
  const nodeModulesPath = findClosest("node_modules", cwd.path);
  // istanbul ignore if
  if (nodeModulesPath === undefined) {
    return undefined;
  }

  const pairs: Array<[string, string]> = flatMap(
    Object.entries(KNOWN_TOOLS),
    ([name, versions]) => {
      try {
        const pkgPath = absolutePathFromString(
          nodeModulesPath,
          path.join(name, "package.json")
        );
        const pkg: unknown = JSON.parse(
          fs.readFileSync(pkgPath.absolutePath, "utf8")
        );

        const version =
          isRecord(pkg) && typeof pkg.version === "string"
            ? pkg.version
            : undefined;
        if (version === undefined) {
          return [];
        }

        // Exact version match.
        if (Object.hasOwnProperty.call(versions, version)) {
          return [[name, version]];
        }

        // Support for example 0.19.1-3 -> 0.19.1.
        const alternateVersion = split(version, /[+-]/)[0];
        if (Object.hasOwnProperty.call(versions, alternateVersion)) {
          return [[name, alternateVersion]];
        }

        // If we find for example elm-json@0.2.7 in node_modules, try to find a
        // supported semver-matching elm-json version such as 0.2.8.
        const tool = getToolThrowing({
          name,
          version: `^${version}`,
          cwd,
          env,
          preferVersionsOnDisk: false,
        });
        return [[tool.name, tool.version]];
      } catch (_error) {
        return [];
      }
    }
  );

  return isNonEmptyArray(pairs) ? fromEntries(pairs) : undefined;
}

function getElmVersionFromElmJson(cwd: Cwd): string | undefined {
  try {
    return getElmVersionFromElmJsonHelper(cwd);
  } catch (_error) {
    return undefined;
  }
}

const elmVersionRangeRegex = /^\s*(\S+)\s*<=\s*v\s*<\s*(\S+)\s*$/;

function getElmVersionFromElmJsonHelper(cwd: Cwd): string {
  const { elmJson } = tryGetElmJson(cwd);

  const elmVersion = elmJson["elm-version"];
  if (typeof elmVersion !== "string") {
    throw new Error(
      `Expected "elm-version" to be a string but got: ${JSON.stringify(
        elmVersion
      )}`
    );
  }

  switch (elmJson.type) {
    case "application":
      if (!Object.hasOwnProperty.call(KNOWN_TOOLS.elm, elmVersion)) {
        throw new Error(`Unknown/unsupported Elm version: ${elmVersion}`);
      }
      return elmVersion;

    case "package": {
      const match = elmVersionRangeRegex.exec(elmVersion);

      if (match === null) {
        throw new Error(
          `Elm version range did not match the regex: ${elmVersion}`
        );
      }

      const [, lowerBoundInclusive, upperBoundExclusive] = match;

      const version = getLatestVersionInRange(
        // `lowerBoundInclusive` and `upperBoundExclusive` are always matched in
        // the regex, but TypeScript doesn’t know that.
        lowerBoundInclusive as string,
        upperBoundExclusive as string,
        Object.keys(KNOWN_TOOLS.elm).reverse()
      );

      if (version === undefined) {
        throw new Error(`No version found for: ${elmVersion}`);
      }

      return version;
    }

    default:
      throw new Error(
        `Expected "type" to be "application" or "package" but got: ${JSON.stringify(
          elmJson.type
        )}`
      );
  }
}
