import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Asset, KNOWN_TOOLS, OSName } from "./known_tools";
import {
  bold,
  Env,
  findClosest,
  indent,
  isRecord,
  NonEmptyArray,
  partitionMap,
  printNumErrors,
} from "./mixed";

export const isWindows = os.platform() === "win32";

export function elmToolingInstallPath(cwd: string, env: Env): string {
  /* istanbul ignore next */
  const elmHome =
    env.ELM_HOME ||
    (isWindows
      ? path.join(
          env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
          "elm"
        )
      : path.join(os.homedir(), ".elm"));

  return path.join(path.resolve(cwd, elmHome), "elm-tooling");
}

export type ParseResult =
  | {
      tag: "ElmToolingJsonNotFound";
      message: string;
    }
  | {
      tag: "ReadAsJsonObjectError";
      elmToolingJsonPath: string;
      message: string;
    }
  | {
      tag: "Parsed";
      elmToolingJsonPath: string;
      unknownFields: Array<string>;
      entrypoints?: FieldResult<NonEmptyArray<Entrypoint>>;
      tools?: FieldResult<Tools>;
    };

export type FieldResult<T> =
  | { tag: "Error"; errors: NonEmptyArray<FieldError> }
  | { tag: "Parsed"; parsed: T };

export type FieldError = {
  path: Array<string | number>;
  message: string;
};

export type Entrypoint = {
  relativePath: string;
  absolutePath: string;
};

export type Tools = {
  existing: Array<Tool>;
  missing: Array<Tool>;
};

export type Tool = {
  name: string;
  version: string;
  absolutePath: string;
  asset: Asset;
};

export function findReadAndParseElmToolingJson(
  cwd: string,
  env: Env
): ParseResult {
  const elmToolingJsonPath = findClosest("elm-tooling.json", cwd);
  if (elmToolingJsonPath === undefined) {
    return {
      tag: "ElmToolingJsonNotFound",
      message: "No elm-tooling.json found. To create one: elm-tooling init",
    };
  }

  let json: unknown = undefined;
  try {
    json = JSON.parse(fs.readFileSync(elmToolingJsonPath, "utf-8"));
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
        const osName = getOSName();
        result.tools = prefixFieldResult(
          "tools",
          osName instanceof Error
            ? /* istanbul ignore next */
              {
                tag: "Error" as const,
                errors: [
                  { path: [], message: osName.message },
                ] as NonEmptyArray<FieldError>,
              }
            : parseTools(cwd, env, osName, value)
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

export function getOSName(): OSName | Error {
  /* istanbul ignore next */
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

function prefixFieldResult<T>(
  prefix: string,
  fieldResult: FieldResult<T>
): FieldResult<T> {
  switch (fieldResult.tag) {
    case "Error":
      return {
        tag: "Error",
        errors: fieldResult.errors.map(({ path, message }) => ({
          path: [prefix, ...path],
          message,
        })) as NonEmptyArray<FieldError>,
      };

    case "Parsed":
      return fieldResult;
  }
}

export type FileExists =
  | { tag: "Exists" }
  | { tag: "DoesNotExist"; message: string }
  | { tag: "Error"; message: string };

export function validateFileExists(fullPath: string): FileExists {
  try {
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return { tag: "Error", message: `Exists but is not a file: ${fullPath}` };
    }
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    /* istanbul ignore else */
    if (error.code === "ENOENT") {
      return {
        tag: "DoesNotExist",
        message: `File does not exist: ${fullPath}`,
      };
    } else {
      return {
        tag: "Error",
        message: `File error for ${fullPath}: ${error.message}`,
      };
    }
  }
  return { tag: "Exists" };
}

function parseEntrypoints(
  elmToolingJsonPath: string,
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

  if (json.length === 0) {
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

  const [errors, entrypoints]: [
    Array<FieldError>,
    Array<Entrypoint>
  ] = partitionMap(json, (entrypoint, index, _, entrypointsSoFar) => {
    if (typeof entrypoint !== "string") {
      return {
        tag: "Left",
        value: {
          path: [index],
          message: `Expected a string but got: ${JSON.stringify(entrypoint)}`,
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

    const absolutePath = path.join(
      path.dirname(elmToolingJsonPath),
      entrypoint
    );

    const exists = validateFileExists(absolutePath);
    if (exists.tag !== "Exists") {
      return {
        tag: "Left",
        value: { path: [index], message: exists.message },
      };
    }

    if (
      entrypointsSoFar.some(
        (otherEntrypoint) => otherEntrypoint.absolutePath === absolutePath
      )
    ) {
      return {
        tag: "Left",
        value: {
          path: [index],
          message: `Duplicate entrypoint: ${absolutePath}`,
        },
      };
    }

    return {
      tag: "Right",
      value: {
        relativePath: entrypoint,
        absolutePath,
      },
    };
  });

  if (errors.length > 0) {
    return {
      tag: "Error",
      errors: errors as NonEmptyArray<FieldError>,
    };
  }

  return { tag: "Parsed", parsed: entrypoints as NonEmptyArray<Entrypoint> };
}

function parseTools(
  cwd: string,
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

  const [errors, tools]: [
    Array<FieldError>,
    Array<[boolean, Tool]>
  ] = partitionMap(Object.entries(json), ([name, version]) => {
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

    const versions = Object.prototype.hasOwnProperty.call(KNOWN_TOOLS, name)
      ? KNOWN_TOOLS[name]
      : undefined;

    if (versions === undefined) {
      return {
        tag: "Left",
        value: {
          path: [name],
          message: `Unknown tool\nKnown tools: ${Object.keys(KNOWN_TOOLS).join(
            ", "
          )}`,
        },
      };
    }

    const osAssets = Object.prototype.hasOwnProperty.call(versions, version)
      ? versions[version]
      : undefined;

    if (osAssets === undefined) {
      return {
        tag: "Left",
        value: {
          path: [name],
          message: `Unknown version: ${version}\nKnown versions: ${Object.keys(
            versions
          ).join(", ")}`,
        },
      };
    }

    const asset = osAssets[osName];

    const tool: Tool = {
      name,
      version,
      absolutePath: getToolAbsolutePath(
        elmToolingInstallPath(cwd, env),
        name,
        version,
        asset.fileName
      ),
      asset,
    };

    const exists = validateFileExists(tool.absolutePath);

    switch (exists.tag) {
      case "Exists":
        return {
          tag: "Right",
          value: [true, tool] as [boolean, Tool],
        };

      case "DoesNotExist":
        return {
          tag: "Right",
          value: [false, tool] as [boolean, Tool],
        };

      case "Error":
        return {
          tag: "Left",
          value: { path: [name], message: exists.message },
        };
    }
  });

  if (errors.length > 0) {
    return {
      tag: "Error",
      errors: errors as NonEmptyArray<FieldError>,
    };
  }

  const [existing, missing]: [Array<Tool>, Array<Tool>] = partitionMap(
    tools,
    ([exists, tool]) =>
      exists ? { tag: "Left", value: tool } : { tag: "Right", value: tool }
  );

  return {
    tag: "Parsed",
    parsed: { existing, missing },
  };
}

function getToolAbsolutePath(
  elmToolingInstallPath: string,
  name: string,
  version: string,
  fileName: string
) {
  return path.join(elmToolingInstallPath, name, version, fileName);
}

export function printFieldErrors(errors: Array<FieldError>): string {
  return [
    printNumErrors(errors.length),
    ...errors.map(
      (error) => `${bold(joinPath(error.path))}\n${indent(error.message)}`
    ),
  ].join("\n\n");
}

function joinPath(errorPath: Array<string | number>): string {
  /* istanbul ignore if */
  if (errorPath.length === 0) {
    return "General";
  }
  const rest = errorPath
    .slice(1)
    .map((segment) => `[${JSON.stringify(segment)}]`);
  return `${errorPath[0]}${rest.join("")}`;
}
