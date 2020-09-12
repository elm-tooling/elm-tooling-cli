import * as path from "path";
import * as stream from "stream";

export class FailReadStream extends stream.Readable {
  _read(size: number): void {
    throw new Error(
      `Expected FailReadStream not to be read but tried to read ${size} bytes.`
    );
  }
}

export class FailWriteStream extends stream.Writable {
  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    callback(
      new Error(
        `Expected FailWriteStream not to be written to but tried to write: ${chunk.toString()}`
      )
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
  return (
    string
      .split(__dirname)
      .join(path.join(root, "Users", "you", "project"))
      // eslint-disable-next-line no-control-regex
      .replace(/\x1B\[0?m/g, "⧘")
      // eslint-disable-next-line no-control-regex
      .replace(/\x1B\[\d+m/g, "⧙")
  );
}
