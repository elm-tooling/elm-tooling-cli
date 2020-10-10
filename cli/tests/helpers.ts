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

export class RawReadStream extends stream.Readable implements ReadStream {
  isRaw = false;

  isTTY = true;

  private index = 0;

  constructor(private chars: Array<string>) {
    super();
  }

  _read(size: number): void {
    if (!this.isRaw) {
      throw new Error(
        `Expected \`.setRawMode(true)\` to be called before reading, but tried to read ${size} bytes with \`.isRaw = false\`.`
      );
    }
    this.push(this.chars[this.index]);
    this.index++;
  }

  setRawMode(isRaw: boolean): void {
    this.isRaw = isRaw;
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

const cursorToggle = /\x1B\[\?25[hl]/g;
const cursorMove = /^\x1b\[(\d+)([ABCD])$/;
const split = /(\n|\x1b\[\d+[ABCD])/;
const color = /(\x1B\[\d*m)/g;

function parseCursorMove(
  num: number,
  char: string
): { dx: number; dy: number } {
  switch (char) {
    case "A":
      return { dx: 0, dy: -num };
    case "B":
      return { dx: 0, dy: num };
    case "C":
      return { dx: num, dy: 0 };
    case "D":
      return { dx: -num, dy: 0 };
    default:
      throw new Error(`Unknown cursor move char: ${char}`);
  }
}

function colorAwareSlice(
  string: string,
  start: number,
  end: number = string.length
): string {
  let result = "";
  let index = 0;
  for (const [i, part] of string.split(color).entries()) {
    if (i % 2 === 0) {
      for (const char of part.split("")) {
        if (index >= start && index < end) {
          result += char;
        }
        index++;
      }
    } else if (
      start === 0 && end === 0
        ? false
        : start === 0
        ? index >= 0 && index <= end
        : index > start && index <= end
    ) {
      result += part;
    }
  }
  return result;
}

export class CursorWriteStream extends stream.Writable implements WriteStream {
  isTTY = true;

  private lines: Array<string> = [];

  private cursor = { x: 0, y: 0 };

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    const parts = chunk.toString().replace(cursorToggle, "").split(split);
    for (const part of parts) {
      if (part === "") {
        // Do nothing.
      } else if (part === "\n") {
        this.cursor = { x: 0, y: this.cursor.y + 1 };
      } else {
        const match = cursorMove.exec(part);
        if (match !== null) {
          const { dx, dy } = parseCursorMove(Number(match[1]), match[2]);
          const cursor = { x: this.cursor.x + dx, y: this.cursor.y + dy };
          if (cursor.x < 0 || cursor.y < 0) {
            callback(
              new Error(
                `Cursor out of bounds: ${JSON.stringify(
                  this.cursor
                )} + ${JSON.stringify({ dx, dy })} = ${JSON.stringify(cursor)}`
              )
            );
            return;
          } else {
            this.cursor = cursor;
          }
        } else {
          const yDiff = this.cursor.y - this.lines.length + 1;
          if (yDiff > 0) {
            this.lines.push(...Array.from({ length: yDiff }, () => ""));
          }
          const line = this.lines[this.cursor.y];
          const xDiff = this.cursor.x - line.replace(color, "").length;
          const paddedLine = xDiff > 0 ? line + " ".repeat(xDiff) : line;
          const partLength = part.replace(color, "").length;
          const nextLine =
            colorAwareSlice(paddedLine, 0, this.cursor.x) +
            part +
            colorAwareSlice(paddedLine, this.cursor.x + partLength);
          this.lines[this.cursor.y] = nextLine;
          this.cursor = { x: this.cursor.x + partLength, y: this.cursor.y };
        }
      }
    }
    callback();
  }

  getOutput(): string {
    const line = this.lines[this.cursor.y] ?? "";
    const char = colorAwareSlice(line, this.cursor.x, this.cursor.x + 1);
    const marker = char.startsWith("x") ? "☒" : "▊";
    return [
      ...this.lines.slice(0, this.cursor.y),
      colorAwareSlice(line, 0, this.cursor.x) +
        marker +
        char.slice(1) +
        colorAwareSlice(line, this.cursor.x + 1),
      ...this.lines.slice(this.cursor.y + 1),
    ].join("\n");
  }
}

export function clean(string: string): string {
  const { root } = path.parse(__dirname);

  // Replace start of absolute paths with hardcoded stuff so the tests pass on
  // more than one computer. Replace colors for snapshots.
  const cleaned = string
    .split(__dirname)
    .join(path.join(root, "Users", "you", "project"))
    .replace(/(?:\x1B\[0?m)?\x1B\[(?!0)\d+m/g, "⧙")
    .replace(/\x1B\[0?m/g, "⧘");

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
