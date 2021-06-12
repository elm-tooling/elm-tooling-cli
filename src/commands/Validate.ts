import {
  bold,
  dim,
  elmToolingJsonDocumentationLink,
  Env,
  indent,
  isNonEmptyArray,
  join,
  KNOWN_FIELDS,
  NonEmptyArray,
} from "../Helpers";
import type { Logger } from "../Logger";
import {
  Entrypoint,
  FieldError,
  FieldResult,
  findReadAndParseElmToolingJson,
  printFieldErrors,
  Tools,
} from "../Parse";
import type { Cwd } from "../PathHelpers";

export function validate(cwd: Cwd, env: Env, logger: Logger): number {
  const parseResult = findReadAndParseElmToolingJson(cwd, env);

  switch (parseResult.tag) {
    case "ElmToolingJsonNotFound":
      logger.error(parseResult.message);
      return 1;

    case "ReadAsJsonObjectError":
      logger.error(
        bold(parseResult.elmToolingJsonPath.theElmToolingJsonPath.absolutePath)
      );
      logger.error(parseResult.message);
      return 1;

    case "Parsed": {
      const entrypointsErrors =
        parseResult.entrypoints === undefined
          ? []
          : getEntrypointsErrors(parseResult.entrypoints);

      const toolsErrors =
        parseResult.tools === undefined
          ? { tag: "Error", errors: [] }
          : getToolsErrors(parseResult.tools);

      const validationErrors: Array<FieldError> = [
        ...parseResult.unknownFields.map((field) => ({
          path: [field],
          message: `Unknown field\nKnown fields: ${join(KNOWN_FIELDS, ", ")}`,
        })),
        ...entrypointsErrors,
        ...toolsErrors.errors,
      ];

      if (!isNonEmptyArray(validationErrors)) {
        logger.log(
          bold(
            parseResult.elmToolingJsonPath.theElmToolingJsonPath.absolutePath
          )
        );
        logger.log("No errors found.");
        return 0;
      } else {
        logger.error(
          bold(
            parseResult.elmToolingJsonPath.theElmToolingJsonPath.absolutePath
          )
        );
        logger.error("");
        logger.error(printFieldErrors(validationErrors));
        if (
          toolsErrors.tag === "Missing" &&
          isNonEmptyArray(toolsErrors.errors)
        ) {
          logger.error("");
          logger.error(missingToolsText);
        }
        logger.error("");
        logger.error(elmToolingJsonDocumentationLink);
        return 1;
      }
    }
  }
}

const missingToolsText = `
${dim("To download missing tools:")}
${indent("elm-tooling install")}
`.trim();

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
          message: `File does not exist: ${tool.location.theToolPath.absolutePath}`,
        })),
      };
  }
}
