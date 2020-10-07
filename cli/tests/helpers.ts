import * as os from "os";
import * as path from "path";
import * as stream from "stream";

import type { ReadStream, WriteStream } from "../helpers/mixed";

export const IS_WINDOWS = os.platform() === "win32";

export class FailReadStream extends stream.Readable implements ReadStream {
  isTTY = true;

  _read(size: number): void {
    throw new Error(
      `Expected FailReadStream not to be read but tried to read ${size} bytes.`
    );
  }

  setRawMode(): void {
    // Do nothing
  }
}

export class MemoryWriteStream extends stream.Writable implements WriteStream {
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

export function clean(string: string): string {
  const { root } = path.parse(__dirname);

  // Replace start of absolute paths with hardcoded stuff so the tests pass on
  // more than one computer. Replace colors for snapshots.
  const cleaned = string
    .split(__dirname)
    .join(path.join(root, "Users", "you", "project"))
    .replace(/\x1B\[0?m/g, "⧘")
    .replace(/\x1B\[\d+m/g, "⧙");

  // Convert Windows-style paths to Unix-style paths so we can use the same snapshots.
  return IS_WINDOWS
    ? cleaned
        .replace(/[A-Z]:((?:\\[\w.-]+)+\\?)/g, (_, fullPath: string) =>
          fullPath.replace(/\\/g, "/")
        )
        .replace(/\.exe\b/g, "")
    : cleaned;
}

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
export const stringSnapshotSerializer = {
  test: (value: unknown): boolean => typeof value === "string",
  print: String,
};
