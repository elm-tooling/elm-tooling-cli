import { help } from "./commands/Help";
import { init } from "./commands/Init";
import { install } from "./commands/Install";
import { toolsCommand } from "./commands/Tools";
import { Env, join, ReadStream, WriteStream } from "./Helpers";
import { makeLogger } from "./Logger";
import { absolutePathFromString, Cwd } from "./PathHelpers";

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
    cwd: cwdString = process.cwd(),
    env = process.env,
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
  }: Options = {}
): Promise<number> {
  const logger = makeLogger({ env, stdout, stderr });
  const cwd: Cwd = {
    tag: "Cwd",
    path: absolutePathFromString(
      { tag: "AbsolutePath", absolutePath: process.cwd() },
      cwdString
    ),
  };

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
      `Expected a single argument but got: ${join(args.slice(1), " ")}`
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
      logger.log("The `validate` command no longer exists.");
      logger.log('If you have "entrypoints" you can remove that field.');
      logger.log('To validate "tools": elm-tooling install');
      return 0;

    case "install":
      return install(cwd, env, logger);

    case "tools":
      return toolsCommand(cwd, env, logger, stdin, stdout);

    default:
      logger.error(`Unknown command: ${args[0]}`);
      return 1;
  }
}

// istanbul ignore if
if (require.main === module) {
  elmToolingCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: Error) => {
      process.stderr.write(
        `Unexpected error:\n${error.stack ?? error.message}\n`
      );
      process.exitCode = 1;
    }
  );
}
