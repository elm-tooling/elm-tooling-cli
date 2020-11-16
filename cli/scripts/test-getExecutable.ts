import * as fs from "fs";
import * as path from "path";

import getExecutable from "../getExecutable";

const WORK_DIR = path.join(__dirname, "workdirs", "getExecutable");

export async function run(): Promise<void> {
  if (fs.existsSync(WORK_DIR)) {
    rmdirSyncRecursive(WORK_DIR);
  }
  fs.mkdirSync(WORK_DIR, { recursive: true });

  const progress: Array<number> = [];

  const options = {
    name: "elm-json",
    version: "^0.2.8",
    cwd: WORK_DIR,
    env: { ELM_HOME: WORK_DIR },
    onProgress: (percentage: number) => {
      progress.push(percentage);
      process.stdout.write(`${percentage}\n`);
    },
  };

  const absolutePath1 = await getExecutable(options);
  const absolutePath2 = await getExecutable(options);

  if (absolutePath1 !== absolutePath2) {
    throw new Error(pathError(absolutePath1, absolutePath2));
  }

  if (progress.length < 2) {
    throw new Error(
      `Expected at least 2 progress reports but got ${
        progress.length
      }:\n${JSON.stringify(progress, null, 2)}`
    );
  }

  if (progress[0] !== 0 || progress[progress.length - 1] !== 1) {
    throw new Error(
      `Expected progress to start with 0 and end with 1 but got:\n${JSON.stringify(
        progress,
        null,
        2
      )}`
    );
  }

  if (
    progress.some(
      (percentage, index) => index > 0 && progress[index - 1] > percentage
    )
  ) {
    throw new Error(
      `Expected progress to only increase but got:\n${JSON.stringify(
        progress,
        null,
        2
      )}`
    );
  }

  process.stdout.write(`${absolutePath1}\n`);
}

function pathError(absolutePath1: string, absolutePath2: string): string {
  return `
Expected the same absolute path after both invocations.
First:  ${absolutePath1}
Second: ${absolutePath2}
  `.trim();
}

// Can be replaced by `fs.rmdirSync(dir, { recursive: true })` when we don’t
// need to support Node.js 10 anymore.
function rmdirSyncRecursive(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) {
      fs.unlinkSync(path.join(dir, entry.name));
    } else if (entry.isDirectory()) {
      rmdirSyncRecursive(path.join(dir, entry.name));
    } else {
      throw new Error(
        `Unexpected entry that is neither file nor directory: ${entry.name}`
      );
    }
  }
  fs.rmdirSync(dir);
}

if (require.main === module) {
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
}
