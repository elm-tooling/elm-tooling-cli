import * as fs from "fs";
import * as path from "path";

import { ElmTooling, findClosestElmTooling, isRecord } from "../helpers/mixed";
import { tools } from "../helpers/tools";

type ValidatorsSafe = {
  [key in keyof Required<ElmTooling>]: Validator;
};

type Validators = {
  [key: string]: Validator | undefined;
};

type Validator = (elmToolingPath: string, value: unknown) => Array<string>;

const validatorsSafe: ValidatorsSafe = {
  entrypoints: validateEntrypoints,
  tools: validateTools,
};

const validators: Validators = validatorsSafe;

export default function validate(): number {
  const elmToolingPath = findClosestElmTooling();
  if (elmToolingPath === undefined) {
    console.error("No elm-tooling.json found. To create one: elm-tooling init");
    return 1;
  }

  console.error(elmToolingPath);

  let json: unknown = undefined;
  try {
    json = JSON.parse(fs.readFileSync(elmToolingPath, "utf-8"));
  } catch (error) {
    console.error(`Failed to read file as JSON:\n${(error as Error).message}`);
    return 1;
  }

  const validationErrors = validateJson(elmToolingPath, json);

  if (validationErrors.length === 0) {
    console.error("No errors found.");
    return 0;
  } else {
    for (const error of validationErrors) {
      console.error(error);
    }
    return 1;
  }
}

function validateJson(elmToolingPath: string, json: unknown): Array<string> {
  if (!isRecord(json)) {
    return [`Expected an object but got: ${JSON.stringify(json)}`];
  }

  return Object.entries(json).flatMap(([key, value]) => {
    const validator = Object.prototype.hasOwnProperty.call(validators, key)
      ? validators[key]
      : undefined;
    return validator === undefined
      ? `${key}: Unknown field`
      : validator(elmToolingPath, value);
  });
}

function validateEntrypoints(
  elmToolingPath: string,
  value: unknown
): Array<string> {
  if (!Array.isArray(value)) {
    return [`entrypoints: Expected an array but got: ${JSON.stringify(value)}`];
  }

  if (value.length === 0) {
    return [`entrypoints: Expected at least one entrypoint but got 0`];
  }

  return value.flatMap((entrypoint, index) => {
    if (typeof entrypoint !== "string") {
      return `entrypoints[${index}]: Expected a string but got: ${JSON.stringify(
        entrypoint
      )}`;
    }

    if (!entrypoint.startsWith("./")) {
      return `entrypoints[${index}]: Expected the string to start with "./" (to indicate that it is a relative path) but got: ${JSON.stringify(
        entrypoint
      )}`;
    }

    const fullPath = path.join(path.dirname(elmToolingPath), entrypoint);
    try {
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        return `entrypoints[${index}]: Exists but is not a file: ${fullPath}`;
      }
    } catch (error) {
      if ((error as Error & { code: string }).code === "ENOENT") {
        return `entrypoints[${index}]: File does not exist: ${fullPath}`;
      }
      return `entrypoints[${index}]: File error for ${fullPath}: ${
        (error as Error).message
      }`;
    }

    return [];
  });
}

function validateTools(_elmToolingPath: string, value: unknown): Array<string> {
  if (!isRecord(value)) {
    return [`tools: Expected an object but got: ${JSON.stringify(value)}`];
  }

  return Object.entries(value).flatMap(([name, version]) => {
    if (typeof version !== "string") {
      return `tools[${JSON.stringify(
        name
      )}]: Expected a version as a string but got: ${JSON.stringify(version)}`;
    }

    const versions = Object.prototype.hasOwnProperty.call(tools, name)
      ? tools[name]
      : undefined;

    return versions === undefined
      ? `tools[${JSON.stringify(name)}]: Unknown tool`
      : Object.prototype.hasOwnProperty.call(versions, version)
      ? []
      : `tools[${JSON.stringify(name)}]: Unknown version: ${version}`;
  });
}
