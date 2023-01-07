import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  bold,
  Env,
  flatMap,
  getOwn,
  indent,
  isNonEmptyArray,
  isRecord,
  join,
  NonEmptyArray,
  printNumErrors,
  toError,
} from "./Helpers";
import {
  Asset,
  KNOWN_TOOL_NAMES,
  KNOWN_TOOLS,
  PlatformAssets,
} from "./KnownTools";
import {
  absoluteDirname,
  AbsolutePath,
  absolutePathFromString,
  Cwd,
  ElmToolingJsonPath,
  findClosest,
  ToolPath,
} from "./PathHelpers";

export const isWindows = os.platform() === "win32";

export function getElmToolingInstallPath(cwd: Cwd, env: Env): AbsolutePath {
  // istanbul ignore next
  const elmHome =
    env.ELM_HOME ??
    (isWindows
      ? path.join(
          env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
          "elm"
        )
      : path.join(os.homedir(), ".elm"));

  return absolutePathFromString(cwd.path, path.join(elmHome, "elm-tooling"));
}

export type ParseResult =
  | {
      tag: "ElmToolingJsonNotFound";
      message: string;
    }
  | {
      tag: "Parsed";
      elmToolingJsonPath: ElmToolingJsonPath;
      // Preserved for legacy reasons:
      originalObject: Record<string, unknown>;
      tools?: Tools;
      platform: string;
    }
  | {
      tag: "ReadAsJsonObjectError";
      elmToolingJsonPath: ElmToolingJsonPath;
      errors: NonEmptyArray<ParseError>;
    };

export type ParseError =
  | {
      tag: "Message";
      message: string;
    }
  | {
      tag: "UnknownField";
      field: string;
    }
  | {
      tag: "WithPath";
      path: ["tools", ...Array<string>];
      message: string;
    };

export type Tools = {
  existing: Array<Tool>;
  missing: Array<Tool>;
  unsupported: Array<UnsupportedTool>;
};

export type Tool = {
  name: string;
  version: string;
  location: ToolPath;
  asset: Asset;
};

export type UnsupportedTool = {
  name: string;
  version: string;
  supportedPlatforms: Array<string>;
};

export function findReadAndParseElmToolingJson(
  cwd: Cwd,
  env: Env
): ParseResult {
  const elmToolingJsonPathRaw = findClosest("elm-tooling.json", cwd.path);
  if (elmToolingJsonPathRaw === undefined) {
    return {
      tag: "ElmToolingJsonNotFound",
      message: "No elm-tooling.json found. To create one: elm-tooling init",
    };
  }

  const elmToolingJsonPath: ElmToolingJsonPath = {
    tag: "ElmToolingJsonPath",
    theElmToolingJsonPath: elmToolingJsonPathRaw,
  };

  let json: unknown = undefined;
  try {
    json = JSON.parse(
      fs.readFileSync(
        elmToolingJsonPath.theElmToolingJsonPath.absolutePath,
        "utf-8"
      )
    );
  } catch (unknownError) {
    const error = toError(unknownError);
    return {
      tag: "ReadAsJsonObjectError",
      elmToolingJsonPath,
      errors: [
        {
          tag: "Message",
          message: `Failed to read file as JSON:\n${error.message}`,
        },
      ],
    };
  }

  if (!isRecord(json)) {
    return {
      tag: "ReadAsJsonObjectError",
      elmToolingJsonPath,
      errors: [
        {
          tag: "Message",
          message: `Expected an object but got: ${JSON.stringify(json)}`,
        },
      ],
    };
  }

  const platform = getPlatform();

  const result: ParseResult = {
    tag: "Parsed",
    elmToolingJsonPath,
    originalObject: json,
    platform,
  };

  const errors: Array<ParseError> = [];

  for (const [field, value] of Object.entries(json)) {
    switch (field) {
      // Ignored for legacy reasons.
      case "entrypoints":
        break;

      case "tools": {
        const toolsResult = parseTools(cwd, env, platform, value);
        if (Array.isArray(toolsResult)) {
          errors.push(...toolsResult);
        } else {
          result.tools = toolsResult;
        }
        break;
      }

      default:
        errors.push({ tag: "UnknownField", field });
        break;
    }
  }

  if (isNonEmptyArray(errors)) {
    return {
      tag: "ReadAsJsonObjectError",
      elmToolingJsonPath,
      errors,
    };
  }

  return result;
}

function getPlatform(): string {
  return `${os.platform()}-${os.arch()}`;
}

export type FileExists =
  | { tag: "DoesNotExist"; message: string }
  | { tag: "Error"; message: string }
  | { tag: "Exists" };

export function validateFileExists(fullPath: AbsolutePath): FileExists {
  try {
    const stats = fs.statSync(fullPath.absolutePath);
    if (!stats.isFile()) {
      return {
        tag: "Error",
        message: `Exists but is not a file: ${fullPath.absolutePath}`,
      };
    }
  } catch (unknownError) {
    const error = toError(unknownError);
    switch (error.code) {
      case "ENOENT":
        return {
          tag: "DoesNotExist",
          message: `File does not exist: ${fullPath.absolutePath}`,
        };
      case "ENOTDIR":
        return {
          tag: "Error",
          message: `A part of this path exist, but is not a directory (which it needs to be): ${
            absoluteDirname(fullPath).absolutePath
          }`,
        };
      // istanbul ignore next
      default:
        return {
          tag: "Error",
          message: `File error for ${fullPath.absolutePath}: ${error.message}`,
        };
    }
  }
  return { tag: "Exists" };
}

function parseTools(
  cwd: Cwd,
  env: Env,
  platform: string,
  json: unknown
): NonEmptyArray<ParseError> | Tools {
  if (!isRecord(json)) {
    return [
      {
        tag: "WithPath",
        path: ["tools"],
        message: `Expected an object but got: ${JSON.stringify(json)}`,
      },
    ];
  }

  const errors: Array<ParseError> = [];

  const tools: Tools = {
    existing: [],
    missing: [],
    unsupported: [],
  };

  for (const [name, version] of Object.entries(json)) {
    if (typeof version !== "string") {
      errors.push({
        tag: "WithPath",
        path: ["tools", name],
        message: `Expected a version as a string but got: ${JSON.stringify(
          version
        )}`,
      });
      continue;
    }

    const versions = getOwn(KNOWN_TOOLS, name);

    if (versions === undefined) {
      errors.push({
        tag: "WithPath",
        path: ["tools", name],
        message: `Unknown tool\nKnown tools: ${join(KNOWN_TOOL_NAMES, ", ")}`,
      });
      continue;
    }

    const platformAssets = getOwn(versions, version);

    if (platformAssets === undefined) {
      errors.push({
        tag: "WithPath",
        path: ["tools", name],
        message: `Unknown version: ${version}\nKnown versions: ${join(
          Object.keys(versions),
          ", "
        )}`,
      });
      continue;
    }

    const asset = platformAssets[platform];

    // istanbul ignore if
    if (asset === undefined) {
      tools.unsupported.push({
        name,
        version,
        supportedPlatforms: Object.keys(platformAssets),
      });
      continue;
    }

    const tool = makeTool(cwd, env, name, version, asset);

    const exists = validateFileExists(tool.location.theToolPath);

    switch (exists.tag) {
      case "Exists":
        tools.existing.push(tool);
        break;

      case "DoesNotExist":
        tools.missing.push(tool);
        break;

      case "Error":
        errors.push({
          tag: "WithPath",
          path: ["tools", name],
          message: exists.message,
        });
        break;
    }
  }

  return isNonEmptyArray(errors) ? errors : tools;
}

export function makeTool(
  cwd: Cwd,
  env: Env,
  name: string,
  version: string,
  asset: Asset
): Tool {
  return {
    name,
    version,
    location: {
      tag: "ToolPath",
      theToolPath: absolutePathFromString(
        getElmToolingInstallPath(cwd, env),
        path.join(name, version, asset.fileName)
      ),
    },
    asset,
  };
}

export function printParseErrors(errors: NonEmptyArray<ParseError>): string {
  return join(
    flatMap(
      [
        printNumErrors(errors.length),
        ...errors.map((error) => {
          switch (error.tag) {
            case "Message":
              return error.message;

            case "UnknownField":
              return `${bold(error.field)}\n${indent("Unknown field")}`;

            case "WithPath":
              return `${bold(joinPath(error.path))}\n${indent(error.message)}`;
          }
        }),
      ],
      (item) => (item === undefined ? [] : [item])
    ),
    "\n\n"
  );
}

function joinPath(errorPath: Array<number | string>): string {
  // istanbul ignore if
  if (!isNonEmptyArray(errorPath)) {
    return "General";
  }
  const rest = errorPath
    .slice(1)
    .map((segment) => `[${JSON.stringify(segment)}]`);
  return `${errorPath[0]}${join(rest, "")}`;
}

const versionRangeRegex = /^([=~^])(\d+)\.(\d+)\.(\d+)([+-].+)?$/;
const prereleaseRegex = /-.+$/;
const collator = new Intl.Collator("en", { numeric: true });

function hasPrerelease(version: string): boolean {
  return /[+-]/.exec(version)?.[0] === "-";
}

function hasSameBase(a: string, b: string): boolean {
  return a.replace(prereleaseRegex, "") === b.replace(prereleaseRegex, "");
}

export function getToolThrowing({
  name,
  version: versionRange,
  cwd,
  env,
}: {
  name: string;
  version: string;
  cwd: Cwd;
  env: Env;
}): Tool {
  const platform = getPlatform();

  const versions = getOwn(KNOWN_TOOLS, name);

  if (versions === undefined) {
    throw new Error(
      `Unknown tool: ${name}\nKnown tools: ${join(KNOWN_TOOL_NAMES, ", ")}`
    );
  }

  const matchingVersion = getLatestMatchingVersion(
    versionRange,
    Object.keys(versions).reverse()
  );

  if (matchingVersion === undefined) {
    throw new Error(
      `No ${name} versions matching: ${versionRange}\nKnown versions: ${join(
        Object.keys(versions),
        ", "
      )}`
    );
  }

  // `matchingVersion` is derived from `Object.keys` above, so it’s safe to use
  // as index.
  const platformAssets = versions[matchingVersion] as PlatformAssets;
  const asset = platformAssets[platform];

  // istanbul ignore if
  if (asset === undefined) {
    throw new Error(
      `${name} ${matchingVersion} does not support your platform, ${platform}\nSupported platforms: ${join(
        Object.keys(platformAssets),
        ", "
      )}`
    );
  }

  return makeTool(cwd, env, name, matchingVersion, asset);
}

export function getLatestMatchingVersion(
  versionRange: string,
  sortedValidVersions: Array<string>
): string | undefined {
  const match = versionRangeRegex.exec(versionRange);

  if (match === null) {
    throw new Error(
      `Version ranges must start with ^ or ~ (or = if you really need an exact version) and be followed by 3 dot-separated numbers, but got: ${versionRange}`
    );
  }

  const sign = match[1];
  const major = Number(match[2]);
  const minor = Number(match[3]);
  const lowerBoundInclusive = versionRange.slice(1);
  const upperBoundExclusive =
    major === 0 || sign === "~"
      ? `${major}.${minor + 1}.0`
      : `${major + 1}.0.0`;

  return sign === "="
    ? sortedValidVersions.find((version) => version === lowerBoundInclusive)
    : getLatestVersionInRange(
        lowerBoundInclusive,
        upperBoundExclusive,
        sortedValidVersions
      );
}

export function getLatestVersionInRange(
  lowerBoundInclusive: string,
  upperBoundExclusive: string,
  sortedValidVersions: Array<string>
): string | undefined {
  return sortedValidVersions.find((version) => {
    // For example, `^0.19.1-rc` should not match `0.19.2-alpha`.
    // And `^0.19.1` should not match `0.19.2-alpha`.
    if (
      // Known prereleases can only be matched…
      hasPrerelease(version) &&
      // …if the lower bound mentions a prerelease…
      !(
        hasPrerelease(lowerBoundInclusive) &&
        // …and both are for the same base version.
        hasSameBase(version, lowerBoundInclusive)
      )
    ) {
      // If not (via the `!` above), don’t try to match this version.
      return false;
    }

    // For example, `^0.19.1-rc` should match `0.19.1`.
    if (
      !hasPrerelease(version) &&
      hasPrerelease(lowerBoundInclusive) &&
      hasSameBase(version, lowerBoundInclusive)
    ) {
      return true;
    }

    return (
      collator.compare(version, lowerBoundInclusive) >= 0 &&
      collator.compare(version, upperBoundExclusive) < 0
    );
  });
}
