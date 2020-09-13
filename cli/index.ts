#!/usr/bin/env node

import type { Readable, Writable } from "stream";

import download from "./commands/download";
import help from "./commands/help";
import init from "./commands/init";
import postinstall from "./commands/postinstall";
import validate from "./commands/validate";
import { Logger, makeLogger } from "./helpers/logger";
import type { Env } from "./helpers/mixed";

async function run(
  argv: Array<string>,
  cwd: string,
  env: Env,
  logger: Logger
): Promise<number> {
  // So far no command takes any further arguments.
  // Let each command handle this when needed.
  if (argv.length > 1) {
    logger.error(
      `Expected a single argument but got: ${argv.slice(1).join(" ")}`
    );
    return 1;
  }

  switch (argv[0]) {
    case undefined:
    case "-h":
    case "-help":
    case "--help":
    case "help":
      logger.log(help(cwd, env));
      return 0;

    case "init":
      return await init(cwd, logger);

    case "validate":
      return validate(cwd, env, logger);

    case "download": {
      const result = await download(cwd, env, logger);
      switch (result.tag) {
        case "Exit":
          return result.statusCode;
        case "Success":
          return 0;
      }
    }

    case "postinstall":
      return await postinstall(cwd, env, logger);

    default:
      logger.error(`Unknown command: ${argv[0]}`);
      return 1;
  }
}

type Options = {
  cwd: string;
  env: Env;
  stdin: Readable; // Currently unused but specified to avoid breaking changes in the future.
  stdout: Writable;
  stderr: Writable;
};

export default function elmToolingCli(
  args: Array<string>,
  { cwd, env, stdout, stderr }: Options = {
    cwd: process.cwd(),
    env: process.env,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  }
): Promise<number> {
  return run(args, cwd, env, makeLogger({ env, stdout, stderr }));
}

if (require.main === module) {
  elmToolingCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exit(exitCode);
    },
    (error: Error) => {
      process.stderr.write(
        `Unexpected error:\n${error.stack || error.message}\n`
      );
      process.exit(1);
    }
  );
}
