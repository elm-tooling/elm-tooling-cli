#!/usr/bin/env node

import help from "./commands/help";
import init from "./commands/init";
import install from "./commands/install";
import tools from "./commands/tools";
import validate from "./commands/validate";
import { makeLogger } from "./helpers/logger";
import type { Env, ReadStream, WriteStream } from "./helpers/mixed";

type Options = {
  cwd?: string;
  env?: Env;
  stdin?: ReadStream;
  stdout?: WriteStream;
  stderr?: WriteStream;
};

export default async function elmToolingCli(
  args: Array<string>,
  // istanbul ignore next
  {
    cwd = process.cwd(),
    env = process.env,
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
  }: Options = {}
): Promise<number> {
  const logger = makeLogger({ env, stdout, stderr });

  const isHelp = args.some(
    (arg) => arg === "-h" || arg === "-help" || arg === "--help"
  );
  if (isHelp) {
    logger.log(help(cwd, env));
    return 0;
  }

  // So far no command takes any further arguments.
  // Let each command handle this when needed.
  if (args.length > 1) {
    logger.error(
      `Expected a single argument but got: ${args.slice(1).join(" ")}`
    );
    return 1;
  }

  switch (args[0]) {
    case undefined:
    case "help":
      logger.log(help(cwd, env));
      return 0;

    case "init":
      return init(cwd, env, logger);

    case "validate":
      return validate(cwd, env, logger);

    case "install":
      return install(cwd, env, logger);

    case "tools":
      return tools(cwd, env, logger, stdin, stdout);

    default:
      logger.error(`Unknown command: ${args[0]}`);
      return 1;
  }
}

// istanbul ignore if
if (require.main === module) {
  elmToolingCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exit(exitCode);
    },
    (error: Error) => {
      process.stderr.write(
        `Unexpected error:\n${error.stack ?? error.message}\n`
      );
      process.exit(1);
    }
  );
}
