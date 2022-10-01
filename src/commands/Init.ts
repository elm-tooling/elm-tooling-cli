import * as fs from "fs";
import * as path from "path";

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
import { getLatestVersionInRange, getOSName, getToolThrowing } from "../Parse";
import {
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

export function init(cwd: Cwd, env: Env, logger: Logger): number {
  const elmToolingJsonPath: ElmToolingJsonPath = {
    tag: "ElmToolingJsonPath",
    theElmToolingJsonPath: absolutePathFromString(cwd.path, "elm-tooling.json"),
  };

  const osName = getOSName();

  // istanbul ignore if
  if (osName instanceof Error) {
    logger.error(osName.message);
    return 1;
  }

  if (fs.existsSync(elmToolingJsonPath.theElmToolingJsonPath.absolutePath)) {
    logger.error(bold(elmToolingJsonPath.theElmToolingJsonPath.absolutePath));
    logger.error("Already exists!");
    return 1;
  }

  const tools =
    tryGuessToolsFromNodeModules(cwd, env) ??
    fromEntries(DEFAULT_TOOLS.map((name) => [name, getLastVersion(name)]));

  const elmVersionFromElmJson = getElmVersionFromElmJson(cwd);

  const json: ElmTooling = {
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
        });
        return [[tool.name, tool.version]];
      } catch {
        return [];
      }
    }
  );

  return isNonEmptyArray(pairs) ? fromEntries(pairs) : undefined;
}

function getElmVersionFromElmJson(cwd: Cwd): string | undefined {
  try {
    return getElmVersionFromElmJsonHelper(cwd);
  } catch {
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
