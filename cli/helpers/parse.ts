import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Asset, KNOWN_TOOLS, OSName } from "./known_tools";
import {
  findClosestElmTooling,
  isRecord,
  NonEmptyArray,
  partitionMap,
} from "./mixed";

const elmHome = process.env.ELM_HOME || path.join(os.homedir(), ".elm");
export const elmToolingInstallPath = path.join(elmHome, "elm-tooling");

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
  | { tag: "Error"; errors: NonEmptyArray<string> }
  | { tag: "Parsed"; parsed: T };

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

export function findReadAndParseElmToolingJson(): ParseResult {
  const elmToolingJsonPath = findClosestElmTooling();
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
        result.entrypoints = parseEntrypoints(elmToolingJsonPath, value);
        break;

      case "tools": {
        const osName = getOSName();
        result.tools =
          osName instanceof Error
            ? { tag: "Error", errors: [`tools: ${osName.message}`] }
            : parseTools(osName, value);
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
  switch (process.platform) {
    case "linux":
      return "linux";
    case "darwin":
      return "mac";
    case "win32":
      return "windows";
    default:
      return new Error(
        `Sorry, your platform (${process.platform}) is not supported yet :(`
      );
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
    if (error.code === "ENOENT") {
      return {
        tag: "DoesNotExist",
        message: `File does not exist: ${fullPath}`,
      };
    }
    return {
      tag: "Error",
      message: `File error for ${fullPath}: ${error.message}`,
    };
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
        `entrypoints: Expected an array but got: ${JSON.stringify(json)}`,
      ],
    };
  }

  if (json.length === 0) {
    return {
      tag: "Error",
      errors: [`entrypoints: Expected at least one entrypoint but got 0.`],
    };
  }

  const [errors, entrypoints]: [
    Array<[number, string]>,
    Array<Entrypoint>
  ] = partitionMap(json, (entrypoint, index) => {
    if (typeof entrypoint !== "string") {
      return {
        tag: "Left",
        value: [
          index,
          `Expected a string but got: ${JSON.stringify(entrypoint)}`,
        ],
      };
    }

    if (!entrypoint.startsWith("./")) {
      return {
        tag: "Left",
        value: [
          index,
          `Expected the string to start with "./" (to indicate that it is a relative path) but got: ${JSON.stringify(
            entrypoint
          )}`,
        ],
      };
    }

    const absolutePath = path.join(
      path.dirname(elmToolingJsonPath),
      entrypoint
    );

    const exists = validateFileExists(absolutePath);
    if (exists.tag !== "Exists") {
      return { tag: "Left", value: [index, exists.message] };
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
      errors: errors.map(
        ([index, error]) => `entrypoints[${index}]: ${error}`
      ) as NonEmptyArray<string>,
    };
  }

  return { tag: "Parsed", parsed: entrypoints as NonEmptyArray<Entrypoint> };
}

function parseTools(osName: OSName, json: unknown): FieldResult<Tools> {
  if (!isRecord(json)) {
    return {
      tag: "Error",
      errors: [`tools: Expected an object but got: ${JSON.stringify(json)}`],
    };
  }

  const [errors, tools]: [
    Array<[string, string]>,
    Array<[boolean, Tool]>
  ] = partitionMap(Object.entries(json), ([name, version]) => {
    if (typeof version !== "string") {
      return {
        tag: "Left",
        value: [
          name,
          `Expected a version as a string but got: ${JSON.stringify(version)}`,
        ],
      };
    }

    const versions = Object.prototype.hasOwnProperty.call(KNOWN_TOOLS, name)
      ? KNOWN_TOOLS[name]
      : undefined;

    if (versions === undefined) {
      return { tag: "Left", value: [name, `Unknown tool`] };
    }

    const osAssets = Object.prototype.hasOwnProperty.call(versions, version)
      ? versions[version]
      : undefined;

    if (osAssets === undefined) {
      return {
        tag: "Left",
        value: [name, `Unknown version: ${version}`],
      };
    }

    const tool: Tool = {
      name,
      version,
      absolutePath: getToolAbsolutePath(elmToolingInstallPath, name, version),
      asset: osAssets[osName],
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
        return { tag: "Left", value: [name, exists.message] };
    }
  });

  if (errors.length > 0) {
    return {
      tag: "Error",
      errors: errors.map(
        ([name, error]) => `tools[${JSON.stringify(name)}]: ${error}`
      ) as NonEmptyArray<string>,
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
  version: string
) {
  return path.join(elmToolingInstallPath, name, version, name);
}
