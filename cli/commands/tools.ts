import * as readline from "readline";
import type { Writable } from "stream";

import { KNOWN_TOOLS } from "../helpers/known-tools";
import type { Logger } from "../helpers/logger";
import {
  bold,
  dim,
  elmToolingJsonDocumentationLink,
  Env,
  ReadStream,
} from "../helpers/mixed";
import {
  findReadAndParseElmToolingJson,
  printFieldErrors,
  Tool,
} from "../helpers/parse";

export default async function toolsCommand(
  cwd: string,
  env: Env,
  logger: Logger,
  stdin: ReadStream,
  stdout: Writable
): Promise<number> {
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
      switch (parseResult.tools?.tag) {
        case "Error":
          logger.error(bold(parseResult.elmToolingJsonPath));
          logger.error("");
          logger.error(printFieldErrors(parseResult.tools.errors));
          logger.error("");
          logger.error(elmToolingJsonDocumentationLink);
          return 1;

        case undefined:
          logger.log(bold(parseResult.elmToolingJsonPath));
          return start(logger.handleColor, stdin, stdout, []);

        case "Parsed":
          logger.log(bold(parseResult.elmToolingJsonPath));
          return start(
            logger.handleColor,
            stdin,
            stdout,
            parseResult.tools.parsed.existing.concat(
              parseResult.tools.parsed.missing
            )
          );
      }
    }
  }
}

async function start(
  handleColor: Logger["handleColor"],
  stdin: ReadStream,
  stdout: Writable,
  tools: Array<Tool>
): Promise<number> {
  return new Promise((resolve) => {
    stdin.setRawMode(true);
    stdin.resume();

    const content = handleColor(draw(tools));
    stdout.write(content);

    // TODO: Should start at first x, or latest version of first tool.
    // This is just the inital cursor position state.
    readline.moveCursor(stdout, 3, -(content.split("\n").length - 2));

    stdin.on("data", (buffer: Buffer) => {
      const data = buffer.toString();
      // TODO: Do this in a functional way. Return new state and redraw.
      switch (data) {
        case "\x03": // ctrl+c
          resolve(0);
          break;

        case "\x1b[A": // up
        case "k":
          readline.moveCursor(stdout, 0, -1);
          break;

        case "\x1b[B": // down
        case "j":
          readline.moveCursor(stdout, 0, 1);
          break;

        case "\r": // enter
          resolve(0);
          break;

        case " ": // space
          stdout.write("x");
          readline.moveCursor(stdout, -1, 0);
          break;

        default:
          break;
      }
    });
  });
}

function draw(tools: Array<Tool>): string {
  return Object.keys(KNOWN_TOOLS)
    .map((name) => {
      const versions = Object.keys(KNOWN_TOOLS[name]);
      const selectedIndex = versions.findIndex((version) =>
        tools.some((tool) => tool.name === name && tool.version === version)
      );
      return `${bold(name)}\n${versions
        .map((version, index) => {
          const marker = index === selectedIndex ? bold("x") : " ";
          return `  ${dim("[")}${marker}${dim("]")} ${
            index === selectedIndex || index === versions.length - 1
              ? version
              : dim(version)
          }`;
        })
        .join("\n")}`;
    })
    .concat(
      [
        `${bold("Up")}/${bold("down")} to move`,
        `${bold("Space")} to toggle`,
        `${bold("Enter")} to save`,
        "",
      ].join("\n")
    )
    .join("\n\n");
}
