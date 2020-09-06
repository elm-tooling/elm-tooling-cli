#!/usr/bin/env node

import download from "./commands/download";
import init from "./commands/init";
import postinstall from "./commands/postinstall";
import validate from "./commands/validate";
import { bold, dim } from "./helpers/mixed";
import { elmToolingInstallPath } from "./helpers/parse";

const help = `
${bold("elm-tooling init")}
    Create a sample elm-tooling.json in the current directory

${bold("elm-tooling validate")}
    Validate the closest elm-tooling.json

${bold("elm-tooling download")}
    Download the tools in the closest elm-tooling.json to:
    ${dim(elmToolingInstallPath)}

${bold("elm-tooling postinstall")}
    Download the tools in the closest elm-tooling.json
    and create links to them in node_modules/.bin/

${bold("Environment variables:")}
    ${bold("ELM_HOME")}
        Customize where tools will be downloaded.
        The Elm compiler uses this variable too for where to store packages.

    ${bold("NO_ELM_TOOLING_POSTINSTALL")}
        Disable the postinstall command.

    ${bold("NO_COLOR")}
        Disable colored output.

${bold("Documentation:")}
    https://github.com/lydell/elm-tooling.json/tree/master/cli
`.trim();

async function run(argv: Array<string>): Promise<number> {
  // So far no command takes any further arguments.
  // Let each command handle this when needed.
  if (argv.length > 1) {
    console.error(
      `Expected no extra arguments but got: ${argv.slice(1).join(" ")}`
    );
    return 1;
  }

  switch (argv[0]) {
    case undefined:
    case "-h":
    case "-help":
    case "--help":
    case "help":
      console.log(help);
      return 0;

    case "init":
      return await init();

    case "validate":
      return validate();

    case "download": {
      const result = await download();
      switch (result.tag) {
        case "Exit":
          return result.statusCode;
        case "Success":
          return 0;
      }
    }

    case "postinstall":
      return await postinstall();

    default:
      console.error(`Unknown command: ${argv[0]}`);
      return 1;
  }
}

run(process.argv.slice(2)).then(
  (exitCode) => {
    process.exit(exitCode);
  },
  (error: Error) => {
    console.error("Unexpected error", error);
    process.exit(1);
  }
);
