import * as fs from "fs";
import * as readline from "readline";

import { KNOWN_TOOLS } from "../helpers/known-tools";
import type { Logger } from "../helpers/logger";
import {
  bold,
  dim,
  elmToolingJsonDocumentationLink,
  Env,
  HIDE_CURSOR,
  ReadStream,
  SHOW_CURSOR,
  toJSON,
  WriteStream,
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
  stdout: WriteStream
): Promise<number> {
  if (!stdin.isTTY) {
    logger.error("This command requires stdin to be a TTY.");
    return 1;
  }

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
      const save = (tools: Array<ToolChoice>): void =>
        updateElmToolingJson(
          parseResult.elmToolingJsonPath,
          parseResult.originalObject,
          tools
        );

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
          return start(logger, stdin, stdout, [], save);

        case "Parsed":
          logger.log(bold(parseResult.elmToolingJsonPath));
          return start(
            logger,
            stdin,
            stdout,
            sortTools(
              parseResult.tools.parsed.existing.concat(
                parseResult.tools.parsed.missing
              )
            ),
            save
          );
      }
    }
  }
}

type ToolChoice = { name: string; version: string };

type State = {
  tools: Array<ToolChoice>;
  cursorTool: ToolChoice;
};

type Cmd = "None" | "Exit" | "Save" | "TestExit";

async function start(
  logger: Logger,
  stdin: ReadStream,
  stdout: WriteStream,
  tools: Array<Tool>,
  save: (tools: Array<ToolChoice>) => void
): Promise<number> {
  return new Promise((resolve) => {
    let state: State = {
      tools,
      cursorTool: tools.length > 0 ? tools[0] : getDefaultCursorTool(),
    };

    let cursor: { x: number; y: number } = { x: 0, y: 0 };

    const redraw = ({ moveCursor }: { moveCursor: boolean }): void => {
      // Temporarily hide cursor to avoid seeing it briefly jump around on Windows.
      stdout.write(HIDE_CURSOR);
      readline.moveCursor(stdout, -cursor.x, -cursor.y);

      const content = logger.handleColor(
        `${draw(state.tools)}\n\n${instructions}\n`
      );
      stdout.write(content);

      const y = getCursorLine(state.cursorTool);
      cursor = { x: 3, y };

      if (moveCursor) {
        readline.moveCursor(
          stdout,
          cursor.x,
          -(content.split("\n").length - 1 - cursor.y)
        );
      }

      stdout.write(SHOW_CURSOR);
    };

    logger.log("");
    redraw({ moveCursor: true });
    stdin.setRawMode(true);
    stdin.resume();

    stdin.on("data", (buffer: Buffer) => {
      const [nextState, cmd] = update(buffer.toString(), state);
      state = nextState;

      switch (cmd) {
        case "None":
          redraw({ moveCursor: true });
          break;

        case "Exit":
          redraw({ moveCursor: false });
          logger.log("");
          logger.log("Nothing changed.");
          resolve(0);
          break;

        case "Save":
          redraw({ moveCursor: false });
          logger.log("");
          if (toolsEqual(tools, state.tools)) {
            logger.log("Nothing changed.");
          } else {
            try {
              save(state.tools);
            } catch (errorAny) {
              const error = errorAny as Error;
              logger.error(`Failed to save: ${error.message}`);
              resolve(1);
              break;
            }
            const verb = toolHasBeenAdded(tools, state.tools)
              ? "install"
              : "unlink";
            logger.log(`Saved! To ${verb}: elm-tooling install`);
          }
          resolve(0);
          break;

        case "TestExit":
          redraw({ moveCursor: true });
          resolve(0);
          break;
      }
    });
  });
}

function draw(tools: Array<ToolChoice>): string {
  return Object.keys(KNOWN_TOOLS)
    .map((name) => {
      const versions = Object.keys(KNOWN_TOOLS[name]);
      const selectedIndex = versions.findIndex((version) =>
        tools.some((tool) => tool.name === name && tool.version === version)
      );
      const versionsString = versions
        .map((version, index) => {
          const marker = index === selectedIndex ? bold("x") : " ";
          return `  ${dim("[")}${marker}${dim("]")} ${
            index === selectedIndex ? version : dim(version)
          }`;
        })
        .join("\n");
      return `${bold(name)}\n${versionsString}`;
    })
    .join("\n\n");
}

const instructions = `
${bold("Up")}/${bold("Down")} to move
${bold("Space")} to toggle
${bold("Enter")} to save
`.trim();

function getCursorLine(cursorTool: ToolChoice): number {
  const names = Object.keys(KNOWN_TOOLS);
  const nameIndex = names.indexOf(cursorTool.name);

  // istanbul ignore if
  if (nameIndex === -1) {
    return 1;
  }

  const name = names[nameIndex];
  const versions = Object.keys(KNOWN_TOOLS[name]);
  const versionIndex = versions.indexOf(cursorTool.version);

  // istanbul ignore if
  if (versionIndex === -1) {
    return 1;
  }

  return (
    1 +
    2 * nameIndex +
    versionIndex +
    names
      .slice(0, nameIndex)
      .reduce((sum, name2) => sum + Object.keys(KNOWN_TOOLS[name2]).length, 0)
  );
}

function getDefaultCursorTool(): ToolChoice {
  const [name] = Object.keys(KNOWN_TOOLS);
  const versions = Object.keys(KNOWN_TOOLS[name]);
  const version = versions[versions.length - 1];
  return { name, version };
}

function update(keypress: string, state: State): [State, Cmd] {
  switch (keypress) {
    case "\x03": // ctrl+c
    case "q":
      return [state, "Exit"];

    case "\x1B[A": // up
    case "k":
      return [
        { ...state, cursorTool: updateCursorTool(-1, state.cursorTool) },
        "None",
      ];

    case "\x1B[B": // down
    case "j":
      return [
        { ...state, cursorTool: updateCursorTool(1, state.cursorTool) },
        "None",
      ];

    case "\r": // enter
      return [state, "Save"];

    case " ": // space
    case "x":
    case "o":
      return [
        { ...state, tools: toggleTool(state.cursorTool, state.tools) },
        "None",
      ];

    case "test-exit":
      return [state, "TestExit"];

    default:
      return [state, "None"];
  }
}

function updateCursorTool(delta: number, cursorTool: ToolChoice): ToolChoice {
  const all = Object.keys(KNOWN_TOOLS).flatMap((name) =>
    Object.keys(KNOWN_TOOLS[name]).map((version) => ({ name, version }))
  );
  const index = all.findIndex(
    (tool) =>
      tool.name === cursorTool.name && tool.version === cursorTool.version
  );
  // istanbul ignore if
  if (index === -1) {
    return cursorTool;
  }
  const nextIndex = index + delta;
  return nextIndex < 0 || nextIndex >= all.length ? cursorTool : all[nextIndex];
}

function toggleTool(
  cursorTool: ToolChoice,
  tools: Array<ToolChoice>
): Array<ToolChoice> {
  const isSelected = tools.some(
    (tool) =>
      tool.name === cursorTool.name && tool.version === cursorTool.version
  );
  const filtered = tools.filter((tool) => tool.name !== cursorTool.name);
  return isSelected ? filtered : [...filtered, cursorTool];
}

function updateElmToolingJson(
  elmToolingJsonPath: string,
  originalObject: Record<string, unknown>,
  toolsList: Array<ToolChoice>
): void {
  const tools =
    toolsList.length === 0
      ? undefined
      : Object.fromEntries(
          sortTools(toolsList).map(({ name, version }) => [name, version])
        );

  fs.writeFileSync(elmToolingJsonPath, toJSON({ ...originalObject, tools }));
}

function sortTools<T extends ToolChoice>(tools: Array<T>): Array<T> {
  return tools.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function toolsEqual(a: Array<ToolChoice>, b: Array<ToolChoice>): boolean {
  return (
    a.length === b.length &&
    a.every((toolA) =>
      b.some(
        (toolB) => toolA.name === toolB.name && toolA.version === toolB.version
      )
    )
  );
}

function toolHasBeenAdded(
  before: Array<ToolChoice>,
  after: Array<ToolChoice>
): boolean {
  return after.some(
    (toolA) =>
      !before.some(
        (toolB) => toolA.name === toolB.name && toolA.version === toolB.version
      )
  );
}
