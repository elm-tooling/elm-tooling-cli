import type { NonEmptyArray } from "../helpers/mixed";
import {
  Entrypoint,
  FieldResult,
  findReadAndParseElmToolingJson,
  Tools,
} from "../helpers/parse";

export default function validate(): number {
  const parseResult = findReadAndParseElmToolingJson();

  switch (parseResult.tag) {
    case "ElmToolingJsonNotFound":
      console.error(parseResult.message);
      return 1;

    case "ReadAsJsonObjectError":
      console.error(parseResult.elmToolingJsonPath);
      console.error(parseResult.message);
      return 1;

    case "Parsed": {
      console.error(parseResult.elmToolingJsonPath);
      const entrypointsErrors =
        parseResult.entrypoints === undefined
          ? []
          : getEntrypointsErrors(parseResult.entrypoints);
      const toolsErrors =
        parseResult.tools === undefined
          ? { tag: "Error", errors: [] }
          : getToolsErrors(parseResult.tools);
      const validationErrors = [
        ...parseResult.warnings,
        ...parseResult.unknownFields.map((field) => `${field}: Unknown field`),
        ...entrypointsErrors,
        ...toolsErrors.errors,
      ];
      if (validationErrors.length === 0) {
        console.error("No errors found.");
        return 0;
      } else {
        for (const error of validationErrors) {
          console.error(`\n- ${error}`);
        }
        if (toolsErrors.tag === "Missing" && toolsErrors.errors.length > 0) {
          console.error("\nTo download missing tools: elm-tooling download");
        }
        console.error("\nDocs: https://github.com/lydell/elm-tooling.json");
        return 1;
      }
    }
  }
}

function getEntrypointsErrors(
  fieldResult: FieldResult<NonEmptyArray<Entrypoint>>
): Array<string> {
  switch (fieldResult.tag) {
    case "Error":
      return fieldResult.errors;

    case "Parsed":
      return [];
  }
}

type ToolsErrors =
  | { tag: "Error"; errors: NonEmptyArray<string> }
  | { tag: "Missing"; errors: Array<string> };

function getToolsErrors(fieldResult: FieldResult<Tools>): ToolsErrors {
  switch (fieldResult.tag) {
    case "Error":
      return { tag: "Error", errors: fieldResult.errors };

    case "Parsed":
      return {
        tag: "Missing",
        errors: fieldResult.parsed.missing.map(
          (tool) =>
            `tools[${tool.name}]: File does not exist: ${tool.absolutePath}`
        ),
      };
  }
}
