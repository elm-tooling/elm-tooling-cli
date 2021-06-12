import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  bold,
  Env,
  getOwn,
  indent,
  isNonEmptyArray,
  isRecord,
  join,
  mapNonEmptyArray,
  NonEmptyArray,
  partitionMap,
  partitionMapNonEmpty,
  printNumErrors,
} from "./Helpers";
import {
  Asset,
  KNOWN_TOOL_NAMES,
  KNOWN_TOOLS,
  OSAssets,
  OSName,
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
      originalObject: Record<string, unknown>;
      unknownFields: Array<string>;
      entrypoints?: FieldResult<NonEmptyArray<Entrypoint>>;
      tools?: FieldResult<Tools>;
    }
  | {
      tag: "ReadAsJsonObjectError";
      elmToolingJsonPath: ElmToolingJsonPath;
      message: string;
    };

export type FieldResult<T> =
  | { tag: "Error"; errors: NonEmptyArray<FieldError> }
  | { tag: "Parsed"; parsed: T };

export type FieldError = {
  path: Array<number | string>;
  message: string;
};

export type Entrypoint = {
  relativePath: string;
  absolutePath: AbsolutePath;
};

export type Tools = {
  existing: Array<Tool>;
  missing: Array<Tool>;
  osName: OSName;
};

export type Tool = {
  name: string;
  version: string;
  location: ToolPath;
  asset: Asset;
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
  } catch (errorAny) {
    const error = errorAny as Error;
    return {
      tag: "ReadAsJsonObjectError",
      elmToolingJsonPath,
      message: `Failed to read file as JSON:\n${error.message}`,
    };
  }

  if (!isRecord(json)) {
    return {
      tag: "ReadAsJsonObjectError",
      elmToolingJsonPath,
      message: `Expected an object but got: ${JSON.stringify(json)}`,
    };
  }

  const result: ParseResult = {
    tag: "Parsed",
    originalObject: json,
    elmToolingJsonPath,
    unknownFields: [],
  };

  for (const [field, value] of Object.entries(json)) {
    switch (field) {
      case "entrypoints":
        result.entrypoints = prefixFieldResult(
          "entrypoints",
          parseEntrypoints(elmToolingJsonPath, value)
        );
        break;

      case "tools": {
        result.tools = prefixFieldResult(
          "tools",
          flatMapFieldResult(getOSNameAsFieldResult(), (osName) =>
            parseTools(cwd, env, osName, value)
          )
        );
        break;
      }

      default:
        result.unknownFields.push(field);
        break;
    }
  }

  return result;
}

export function getOSName(): Error | OSName {
  // istanbul ignore next
  switch (os.platform()) {
    case "linux":
      return "linux";
    case "darwin":
      return "mac";
    case "win32":
      return "windows";
    default:
      return new Error(
        `Sorry, your platform (${os.platform()}) is not supported yet :(`
      );
  }
}

export function getOSNameAsFieldResult(): FieldResult<OSName> {
  const osName = getOSName();
  return osName instanceof Error
    ? // istanbul ignore next
      {
        tag: "Error" as const,
        errors: [{ path: [], message: osName.message }],
      }
    : {
        tag: "Parsed",
        parsed: osName,
      };
}

function flatMapFieldResult<T, U>(
  fieldResult: FieldResult<T>,
  f: (parsed: T) => FieldResult<U>
): FieldResult<U> {
  switch (fieldResult.tag) {
    // istanbul ignore next
    case "Error":
      return fieldResult;

    case "Parsed":
      return f(fieldResult.parsed);
  }
}

export function prefixFieldResult<T>(
  prefix: string,
  fieldResult: FieldResult<T>
): FieldResult<T> {
  switch (fieldResult.tag) {
    case "Error":
      return {
        tag: "Error",
        errors: mapNonEmptyArray(
          fieldResult.errors,
          ({ path: fieldPath, message }) => ({
            path: [prefix, ...fieldPath],
            message,
          })
        ),
      };

    case "Parsed":
      return fieldResult;
  }
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
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
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

function parseEntrypoints(
  elmToolingJsonPath: ElmToolingJsonPath,
  json: unknown
): FieldResult<NonEmptyArray<Entrypoint>> {
  if (!Array.isArray(json)) {
    return {
      tag: "Error",
      errors: [
        {
          path: [],
          message: `Expected an array but got: ${JSON.stringify(json)}`,
        },
      ],
    };
  }

  if (!isNonEmptyArray(json)) {
    return {
      tag: "Error",
      errors: [
        {
          path: [],
          message: `Expected at least one entrypoint but got 0.`,
        },
      ],
    };
  }

  const partitioned = partitionMapNonEmpty<unknown, FieldError, Entrypoint>(
    json,
    (entrypoint, index, _, entrypointsSoFar) => {
      if (typeof entrypoint !== "string") {
        return {
          tag: "Left",
          value: {
            path: [index],
            message: `Expected a string but got: ${JSON.stringify(entrypoint)}`,
          },
        };
      }

      if (entrypoint.includes("\\")) {
        return {
          tag: "Left",
          value: {
            path: [index],
            message: `Expected the string to use only "/" as path delimiter but found "\\": ${JSON.stringify(
              entrypoint
            )}`,
          },
        };
      }

      if (!entrypoint.startsWith("./")) {
        return {
          tag: "Left",
          value: {
            path: [index],
            message: `Expected the string to start with "./" (to indicate that it is a relative path) but got: ${JSON.stringify(
              entrypoint
            )}`,
          },
        };
      }

      if (!entrypoint.endsWith(".elm")) {
        return {
          tag: "Left",
          value: {
            path: [index],
            message: `Expected the string to end with ".elm" but got: ${JSON.stringify(
              entrypoint
            )}`,
          },
        };
      }

      const entrypointPath = absolutePathFromString(
        absoluteDirname(elmToolingJsonPath.theElmToolingJsonPath),
        entrypoint
      );

      const exists = validateFileExists(entrypointPath);
      if (exists.tag !== "Exists") {
        return {
          tag: "Left",
          value: { path: [index], message: exists.message },
        };
      }

      if (
        entrypointsSoFar.some(
          (otherEntrypoint) =>
            otherEntrypoint.absolutePath.absolutePath ===
            entrypointPath.absolutePath
        )
      ) {
        return {
          tag: "Left",
          value: {
            path: [index],
            message: `Duplicate entrypoint: ${entrypointPath.absolutePath}`,
          },
        };
      }

      return {
        tag: "Right",
        value: {
          relativePath: entrypoint,
          absolutePath: entrypointPath,
        },
      };
    }
  );

  switch (partitioned.tag) {
    case "OnlyLeft":
    case "Both":
      return {
        tag: "Error",
        errors: partitioned.left,
      };

    case "OnlyRight":
      return {
        tag: "Parsed",
        parsed: partitioned.right,
      };
  }
}

function parseTools(
  cwd: Cwd,
  env: Env,
  osName: OSName,
  json: unknown
): FieldResult<Tools> {
  if (!isRecord(json)) {
    return {
      tag: "Error",
      errors: [
        {
          path: [],
          message: `Expected an object but got: ${JSON.stringify(json)}`,
        },
      ],
    };
  }

  const [errors, tools] = partitionMap<
    [string, unknown],
    FieldError,
    { exists: boolean; tool: Tool }
  >(Object.entries(json), ([name, version]) => {
    if (typeof version !== "string") {
      return {
        tag: "Left",
        value: {
          path: [name],
          message: `Expected a version as a string but got: ${JSON.stringify(
            version
          )}`,
        },
      };
    }

    const versions = getOwn(KNOWN_TOOLS, name);

    if (versions === undefined) {
      return {
        tag: "Left",
        value: {
          path: [name],
          message: `Unknown tool\nKnown tools: ${join(KNOWN_TOOL_NAMES, ", ")}`,
        },
      };
    }

    const osAssets = getOwn(versions, version);

    if (osAssets === undefined) {
      return {
        tag: "Left",
        value: {
          path: [name],
          message: `Unknown version: ${version}\nKnown versions: ${join(
            Object.keys(versions),
            ", "
          )}`,
        },
      };
    }

    const asset = osAssets[osName];

    const tool = makeTool(cwd, env, name, version, asset);

    const exists = validateFileExists(tool.location.theToolPath);

    switch (exists.tag) {
      case "Exists":
        return {
          tag: "Right",
          value: { exists: true, tool },
        };

      case "DoesNotExist":
        return {
          tag: "Right",
          value: { exists: false, tool },
        };

      case "Error":
        return {
          tag: "Left",
          value: { path: [name], message: exists.message },
        };
    }
  });

  if (isNonEmptyArray(errors)) {
    return {
      tag: "Error",
      errors,
    };
  }

  const [existing, missing] = partitionMap<
    { exists: boolean; tool: Tool },
    Tool,
    Tool
  >(tools, ({ exists, tool }) =>
    exists ? { tag: "Left", value: tool } : { tag: "Right", value: tool }
  );

  return {
    tag: "Parsed",
    parsed: { existing, missing, osName },
  };
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

export function printFieldErrors(errors: NonEmptyArray<FieldError>): string {
  return join(
    [
      printNumErrors(errors.length),
      ...errors.map(
        (error) => `${bold(joinPath(error.path))}\n${indent(error.message)}`
      ),
    ],
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
  const osName = getOSName();

  // istanbul ignore if
  if (osName instanceof Error) {
    throw osName;
  }

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
  const asset = (versions[matchingVersion] as OSAssets)[osName];

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
