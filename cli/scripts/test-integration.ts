import * as fs from "fs";
import * as path from "path";

import elmToolingCli from "..";

async function run(): Promise<void> {
  const dir = path.join(
    path.dirname(__dirname),
    "tests",
    "fixtures",
    "init",
    "application"
  );

  const elmToolingJsonPath = path.join(dir, "elm-tooling.json");
  const elmToolingInstallPath = path.join(dir, "elm-tooling");
  const nodeModulesInstallPath = path.join(dir, "node_modules");

  try {
    fs.unlinkSync(elmToolingJsonPath);
    fs.rmdirSync(elmToolingInstallPath, { recursive: true });
    fs.rmdirSync(nodeModulesInstallPath, { recursive: true });
    fs.mkdirSync(nodeModulesInstallPath);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const runCli = async (
    command: string,
    shouldSucceed: boolean
  ): Promise<void> => {
    process.stdout.write(`\n$ elm-tooling ${command}\n`);

    const exitCode = await elmToolingCli([command], {
      cwd: dir,
      env: { ELM_HOME: dir },
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    });

    if (shouldSucceed) {
      if (exitCode !== 0) {
        throw new Error(
          `Expected zero exit code (success) for '${command}' but got ${exitCode}`
        );
      }
    } else {
      if (exitCode === 0) {
        throw new Error(
          `Expected non-zero exit code (failure) for '${command}' but got ${exitCode}`
        );
      }
    }
  };

  // Create elm-tooling.json.
  await runCli("init", true);

  // elm-tooling.json already exists.
  await runCli("init", false);

  // Tools are missing so far:
  await runCli("validate", false);

  // Install tools.
  await runCli("postinstall", true);

  // Running again is ok.
  await runCli("postinstall", true);

  // elm-tooling.json should be valid now.
  await runCli("validate", true);
}

run().then(
  () => {
    process.stdout.write("\nSuccess!\n");
    process.exit(0);
  },
  (error: Error) => {
    process.stderr.write(`\n${error.stack ?? error.message}\n`);
    process.exit(1);
  }
);
