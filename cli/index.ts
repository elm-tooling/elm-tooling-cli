#!/usr/bin/env node

import download from "./commands/download";
import help from "./commands/help";
import init from "./commands/init";
import postinstall from "./commands/postinstall";
import validate from "./commands/validate";

async function run(argv: Array<string>, cwd: string): Promise<number> {
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
      console.log(help(cwd));
      return 0;

    case "init":
      return await init(cwd);

    case "validate":
      return validate(cwd);

    case "download": {
      const result = await download(cwd);
      switch (result.tag) {
        case "Exit":
          return result.statusCode;
        case "Success":
          return 0;
      }
    }

    case "postinstall":
      return await postinstall(cwd);

    default:
      console.error(`Unknown command: ${argv[0]}`);
      return 1;
  }
}

run(process.argv.slice(2), process.cwd()).then(
  (exitCode) => {
    process.exit(exitCode);
  },
  (error: Error) => {
    console.error("Unexpected error", error);
    process.exit(1);
  }
);
