import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as stream from "stream";

import elmToolingCli from "..";
import { KNOWN_TOOLS } from "../helpers/known-tools";
import type { ElmTooling, WriteStream } from "../helpers/mixed";

const WORK_DIR = path.join(__dirname, "all-downloads");
const EXPECTED_FILE = path.join(__dirname, "all-downloads.expected.txt");
const ACTUAL_FILE = path.join(__dirname, "all-downloads.actual.txt");

const CLEAR =
  process.platform === "win32" ? "\x1B[2J\x1B[0f" : "\x1B[2J\x1B[3J\x1B[H";

function join<T>(listOfLists: Array<Array<T>>): Array<Array<T | undefined>> {
  const longestLength = Math.max(0, ...listOfLists.map((list) => list.length));
  return Array.from({ length: longestLength }, (_, i) =>
    Array.from({ length: listOfLists.length }, (_2, j) => listOfLists[j][i])
  );
}

function tree(dir: string): Array<string> {
  return [
    `${path.basename(dir)}/`,
    ...fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isFile()
          ? entry.name.endsWith(".json")
            ? [
                entry.name,
                ...fs
                  .readFileSync(path.join(dir, entry.name), "utf8")
                  .split("\n")
                  .map((line) => `  ${line}`),
              ]
            : entry.name.replace(/\.exe$/, "")
          : entry.isDirectory()
          ? tree(path.join(dir, entry.name))
          : []
      )
      .map((line) => `  ${line}`),
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

export async function run(): Promise<void> {
  const variants: Array<Array<readonly [string, string]>> = join(
    Object.keys(KNOWN_TOOLS).map((name) =>
      Object.keys(KNOWN_TOOLS[name]).map((version) => [name, version] as const)
    )
  ).map((tools) => removeUndefined(tools));

  const stderr = new MemoryWriteStream();

  fs.rmdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(WORK_DIR);

  process.stdout.write(CLEAR);

  const exitCodes = await Promise.all(
    variants.map((tools, index) => {
      const dir = path.join(WORK_DIR, index.toString());

      const elmToolingJson: ElmTooling = {
        tools: Object.fromEntries(tools),
      };

      fs.mkdirSync(dir);
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
      }).then(
        (exitCode) => {
          if (exitCode !== 0) {
            stderr.write(
              `\nPromise at index ${index}: Non-zero exit code: ${exitCode}\n`
            );
          }
          return exitCode;
        },
        (error: Error) => {
          stderr.write(
            `\nPromise at index ${index}: Error: ${error.message}\n`
          );
          return 1;
        }
      );
    })
  );

  readline.cursorTo(process.stdout, 0, calculateHeight(variants));

  if (stderr.content.length > 0) {
    process.stderr.write(`All stderr outputs:\n${stderr.content}`);
  }

  const failed = exitCodes.filter((exitCode) => exitCode !== 0);
  if (failed.length > 0) {
    throw new Error(`${failed.length} exited with non-zero exit code.`);
  }

  const expected = fs.readFileSync(EXPECTED_FILE, "utf8");
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
