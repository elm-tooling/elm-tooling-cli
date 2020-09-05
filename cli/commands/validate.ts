import * as path from "path";

import {
  bold,
  dim,
  elmToolingJsonDocumentationLink,
  NonEmptyArray,
} from "../helpers/mixed";
import {
  Entrypoint,
  FieldError,
  FieldResult,
  findReadAndParseElmToolingJson,
  printFieldErrors,
  Tools,
  validateFileExists,
} from "../helpers/parse";

export default function validate(): number {
  const parseResult = findReadAndParseElmToolingJson();

  switch (parseResult.tag) {
    case "ElmToolingJsonNotFound":
      console.error(parseResult.message);
      return 1;

    case "ReadAsJsonObjectError":
      console.error(bold(parseResult.elmToolingJsonPath));
      console.error(parseResult.message);
      return 1;

    case "Parsed": {
      const elmJsonExists = validateFileExists(
        path.join(path.dirname(parseResult.elmToolingJsonPath), "elm.json")
      );
      const elmJsonErrors =
        elmJsonExists.tag === "Exists"
          ? []
          : [
              {
                path: ["elm.json"],
                message: `There should be an elm.json next to elm-tooling.json\n${elmJsonExists.message}`,
              },
            ];

      const entrypointsErrors =
        parseResult.entrypoints === undefined
          ? []
          : getEntrypointsErrors(parseResult.entrypoints);

      const toolsErrors =
        parseResult.tools === undefined
          ? { tag: "Error", errors: [] }
          : getToolsErrors(parseResult.tools);

      const validationErrors: Array<FieldError> = [
        ...elmJsonErrors,
        ...parseResult.unknownFields.map((field) => ({
          path: [field],
          message: `Unknown field`,
        })),
        ...entrypointsErrors,
        ...toolsErrors.errors,
      ];

      console.error(bold(parseResult.elmToolingJsonPath));

      if (validationErrors.length === 0) {
        console.error("No errors found.");
        return 0;
      } else {
        console.error("");
        console.error(printFieldErrors(validationErrors));
        if (toolsErrors.tag === "Missing" && toolsErrors.errors.length > 0) {
          console.error("");
          console.error(
            `${dim("To download missing tools:")}\n    elm-tooling download`
          );
        }
        console.error("");
        console.error(elmToolingJsonDocumentationLink);
        return 1;
      }
    }
  }
}

function getEntrypointsErrors(
  fieldResult: FieldResult<NonEmptyArray<Entrypoint>>
): Array<FieldError> {
  switch (fieldResult.tag) {
    case "Error":
      return fieldResult.errors;

    case "Parsed":
      return [];
  }
}

type ToolsErrors =
  | { tag: "Error"; errors: NonEmptyArray<FieldError> }
  | { tag: "Missing"; errors: Array<FieldError> };

function getToolsErrors(fieldResult: FieldResult<Tools>): ToolsErrors {
  switch (fieldResult.tag) {
    case "Error":
      return { tag: "Error", errors: fieldResult.errors };

    case "Parsed":
      return {
        tag: "Missing",
        errors: fieldResult.parsed.missing.map((tool) => ({
          path: ["tools", tool.name],
          message: `File does not exist: ${tool.absolutePath}`,
        })),
      };
  }
}
