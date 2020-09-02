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

  const elmJsonError = validateFileExists(
    path.join(path.dirname(elmToolingPath), "elm.json")
  );

  const validationErrors = [
    ...(elmJsonError === undefined
      ? []
      : [`Expected an elm.json next to elm-tooling.json. ${elmJsonError}`]),
    ...validateJson(elmToolingPath, json),
  ];

  if (validationErrors.length === 0) {
    console.error("No errors found.");
    return 0;
  } else {
    for (const error of validationErrors) {
      console.error(`\n- ${error}`);
    }
    console.error("\nDocs: https://github.com/lydell/elm-tooling.json");
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

function validateFileExists(fullPath: string): string | undefined {
  try {
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return `Exists but is not a file: ${fullPath}`;
    }
  } catch (error) {
    if ((error as Error & { code: string }).code === "ENOENT") {
      return `File does not exist: ${fullPath}`;
    }
    return `File error for ${fullPath}: ${(error as Error).message}`;
  }
  return undefined;
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

  return value
    .flatMap((entrypoint) => {
      if (typeof entrypoint !== "string") {
        return `Expected a string but got: ${JSON.stringify(entrypoint)}`;
      }

      if (!entrypoint.startsWith("./")) {
        return `Expected the string to start with "./" (to indicate that it is a relative path) but got: ${JSON.stringify(
          entrypoint
        )}`;
      }

      return (
        validateFileExists(
          path.join(path.dirname(elmToolingPath), entrypoint)
        ) ?? []
      );
    })
    .map((error, index) => `entrypoints[${index}]: ${error}`);
}

function validateTools(_elmToolingPath: string, value: unknown): Array<string> {
  if (!isRecord(value)) {
    return [`tools: Expected an object but got: ${JSON.stringify(value)}`];
  }

  return Object.entries(value).flatMap(([name, version]) => {
    const error = validateTool(name, version);
    return error === undefined
      ? []
      : `tools[${JSON.stringify(name)}]: ${error}`;
  });
}

function validateTool(name: string, version: unknown): string | undefined {
  if (typeof version !== "string") {
    return `Expected a version as a string but got: ${JSON.stringify(version)}`;
  }

  const versions = Object.prototype.hasOwnProperty.call(tools, name)
    ? tools[name]
    : undefined;

  return versions === undefined
    ? `Unknown tool`
    : Object.prototype.hasOwnProperty.call(versions, version)
    ? undefined
    : `Unknown version: ${version}`;
}
