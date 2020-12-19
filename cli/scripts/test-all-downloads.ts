import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as rimraf from "rimraf";
import * as stream from "stream";

import elmToolingCli from "..";
import { KNOWN_TOOLS } from "../helpers/known-tools";
import {
  ElmTooling,
  flatMap,
  fromEntries,
  WriteStream,
} from "../helpers/mixed";

const WORK_DIR = path.join(__dirname, "workdirs", "all-downloads");
const EXPECTED_FILE = path.join(__dirname, "all-downloads.expected.txt");
const ACTUAL_FILE = path.join(__dirname, "all-downloads.actual.txt");

const CLEAR =
  process.platform === "win32" ? "\x1B[2J\x1B[0f" : "\x1B[2J\x1B[3J\x1B[H";

// Read file with normalized line endings to make snapshotting easier
// cross-platform.
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

function join<T>(listOfLists: Array<Array<T>>): Array<Array<T | undefined>> {
  const longestLength = Math.max(0, ...listOfLists.map((list) => list.length));
  return Array.from({ length: longestLength }, (_, i) =>
    Array.from({ length: listOfLists.length }, (_2, j) => listOfLists[j][i])
  );
}

function tree(dir: string): Array<string> {
  return [
    `${path.basename(dir)}/`,
    ...flatMap(fs.readdirSync(dir, { withFileTypes: true }), (entry) =>
      entry.name === "node_modules"
        ? []
        : entry.isFile()
        ? entry.name.endsWith(".json")
          ? [
              entry.name,
              ...readFile(path.join(dir, entry.name))
                .split("\n")
                .map((line) => `  ${line}`),
            ]
          : entry.name.replace(/\.exe$/, "")
        : entry.isDirectory()
        ? tree(path.join(dir, entry.name))
        : []
    ).map((line) => `  ${line}`),
  ];
}

function removeUndefined<T>(list: Array<T | undefined>): Array<T> {
  const result = [];
  for (const item of list) {
    if (item !== undefined) {
      result.push(item);
    }
  }
  return result;
}

function calculateHeight<T>(variants: Array<Array<T>>): number {
  return variants.reduce((sum, otherTools) => sum + otherTools.length + 2, 0);
}

class MemoryWriteStream extends stream.Writable implements WriteStream {
  isTTY = true;

  content = "";

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.content += chunk.toString();
    callback();
  }
}

class CurorWriteStream extends stream.Writable implements WriteStream {
  constructor(
    private variants: Array<Array<readonly [string, string]>>,
    private y: number
  ) {
    super();
  }

  isTTY = true;

  private hasWritten = false;

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    // Only care about the first line and the progress, not the “link created” lines.
    if (!this.hasWritten || chunk.toString().includes("%")) {
      readline.cursorTo(
        process.stdout,
        0,
        this.hasWritten ? this.y + 1 : this.y
      );
      process.stdout.write(chunk);
      readline.cursorTo(process.stdout, 0, calculateHeight(this.variants));
      this.hasWritten = true;
    }
    callback();
  }
}

async function spawnPromise(
  name: string,
  cwd: string,
  stdout: WriteStream
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn("npx", ["--no-install", name, "--help"], {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(stdout);
    child.stderr.pipe(stdout);
    child.on("error", reject);
    child.on("close", resolve);
  });
}

async function runTool({
  name,
  version,
  cwd,
  stderr,
}: {
  name: string;
  version: string;
  cwd: string;
  stderr: MemoryWriteStream;
}): Promise<number> {
  const stdout = new MemoryWriteStream();
  const prefix = `\nSpawn ${name} ${version}`;
  return spawnPromise(name, cwd, stdout).then(
    (exitCode) => {
      if (exitCode !== 0) {
        stderr.write(`${prefix}: Non-zero exit code: ${exitCode}\n`);
        return exitCode;
      }
      if (!stdout.content.includes(name)) {
        stderr.write(
          `${prefix}: Expected output to contain: ${name}\n\n${stdout.content}\n\n`
        );
        return 20;
      }
      if (!stdout.content.includes(version)) {
        stderr.write(
          `${prefix}: Expected output to contain: ${version}\n\n${stdout.content}\n\n`
        );
        return 21;
      }
      return 0;
    },
    (error: Error) => {
      stderr.write(`${prefix}: Error: ${error.message}\n`);
      return 22;
    }
  );
}

export async function run(): Promise<void> {
  const variants: Array<Array<readonly [string, string]>> = join(
    Object.keys(KNOWN_TOOLS).map((name) =>
      Object.keys(KNOWN_TOOLS[name]).map((version) => [name, version] as const)
    )
  ).map((tools) => removeUndefined(tools));

  const stderr = new MemoryWriteStream();

  if (fs.existsSync(WORK_DIR)) {
    rimraf.sync(WORK_DIR);
  }
  fs.mkdirSync(WORK_DIR, { recursive: true });

  process.stdout.write(CLEAR);

  const exitCodes: Array<Array<number>> = await Promise.all(
    variants.map((tools, index) => {
      const dir = path.join(WORK_DIR, index.toString());

      const elmToolingJson: ElmTooling = {
        tools: fromEntries(tools),
      };

      fs.mkdirSync(path.join(dir, "node_modules"), { recursive: true });
      fs.writeFileSync(
        path.join(dir, "elm-tooling.json"),
        JSON.stringify(elmToolingJson, null, 2)
      );

      return elmToolingCli(["install"], {
        cwd: dir,
        env: { ELM_HOME: dir },
        stdin: process.stdin,
        stdout: new CurorWriteStream(
          variants,
          calculateHeight(variants.slice(0, index))
        ),
        stderr,
      })
        .then((exitCode) => {
          if (exitCode !== 0) {
            stderr.write(
              `\nPromise at index ${index}: Non-zero exit code: ${exitCode}\n`
            );
            return [exitCode];
          }
          return Promise.all(
            tools.map(([name, version]) =>
              runTool({ name, version, cwd: dir, stderr })
            )
          );
        })
        .catch((error: Error) => {
          stderr.write(
            `\nPromise at index ${index}: Error: ${error.message}\n`
          );
          return [10];
        });
    })
  );

  readline.cursorTo(process.stdout, 0, calculateHeight(variants));

  if (stderr.content.length > 0) {
    process.stderr.write(`All stderr outputs:\n${stderr.content}`);
  }

  const failed = ([] as Array<number>)
    .concat(...exitCodes)
    .filter((exitCode) => exitCode !== 0);
  if (failed.length > 0) {
    throw new Error(`${failed.length} exited with non-zero exit code.`);
  }

  const expected = readFile(EXPECTED_FILE);
  const actual = `${tree(WORK_DIR).join("\n")}\n`;

  process.stdout.write(actual);

  if (actual !== expected) {
    fs.writeFileSync(ACTUAL_FILE, actual);
    throw new Error(
      `Unexpected output. Run this to see the difference:\ngit diff --no-index scripts/all-downloads.expected.txt scripts/all-downloads.actual.txt`
    );
  }
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
