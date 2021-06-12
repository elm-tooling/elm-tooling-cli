import {
  bold,
  dim,
  elmToolingJsonDocumentationLink,
  Env,
  indent,
  KNOWN_FIELDS,
  NonEmptyArray,
} from "../helpers";
import type { Logger } from "../logger";
import {
  Entrypoint,
  FieldError,
  FieldResult,
  findReadAndParseElmToolingJson,
  printFieldErrors,
  Tools,
} from "../parse";

export default function validate(
  cwd: string,
  env: Env,
  logger: Logger
): number {
  const parseResult = findReadAndParseElmToolingJson(cwd, env);

  switch (parseResult.tag) {
    case "ElmToolingJsonNotFound":
      logger.error(parseResult.message);
      return 1;

    case "ReadAsJsonObjectError":
      logger.error(bold(parseResult.elmToolingJsonPath));
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
          message: `Unknown field\nKnown fields: ${KNOWN_FIELDS.join(", ")}`,
        })),
        ...entrypointsErrors,
        ...toolsErrors.errors,
      ];

      if (validationErrors.length === 0) {
        logger.log(bold(parseResult.elmToolingJsonPath));
        logger.log("No errors found.");
        return 0;
      } else {
        logger.error(bold(parseResult.elmToolingJsonPath));
        logger.error("");
        logger.error(printFieldErrors(validationErrors));
        if (toolsErrors.tag === "Missing" && toolsErrors.errors.length > 0) {
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
          message: `File does not exist: ${tool.absolutePath}`,
        })),
      };
  }
}
