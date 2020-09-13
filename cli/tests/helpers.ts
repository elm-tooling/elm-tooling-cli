import * as os from "os";
import * as path from "path";
import * as stream from "stream";

export class FailReadStream extends stream.Readable {
  _read(size: number): void {
    throw new Error(
      `Expected FailReadStream not to be read but tried to read ${size} bytes.`
    );
  }
}

export class MemoryWriteStream extends stream.Writable {
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
  // more than one computer. Replace colors and cursor movements for snapshots.
  const cleaned = string
    .split(__dirname)
    .join(path.join(root, "Users", "you", "project"))
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\[0?m/g, "⧘")
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\[\d+m/g, "⧙")
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\[(-\d+)A/g, "⬆️ $1");

  // Convert Windows-style paths to Unix-style paths so we can use the same snapshots.
  return os.platform() === "win32"
    ? cleaned
        .replace(/[A-Z]:((?:\\[\w-]+)+)/g, (_, fullPath: string) =>
          fullPath.replace(/\\/g, "/")
        )
        .replace(/\.exe\b/g, "")
    : cleaned;
}
