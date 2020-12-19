import * as readline from "readline";

import { bold, dim } from "../helpers/mixed";
import { clean, CursorWriteStream, stringSnapshotSerializer } from "./helpers";

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("cursor", () => {
  test("moving back and forth with color", () => {
    const stream = new CursorWriteStream();
    stream.on("error", fail);

    readline.moveCursor(stream, 0, 2);

    stream.write(
      `
+--------------+
|              |
|              |
|              |
+--------------+
      `
        .trim()
        .replace(/\|/g, dim("|"))
        .replace(/\+/g, bold("+"))
    );
    stream.write("\n");

    readline.moveCursor(stream, 2, -4);

    stream.write("some text");

    readline.moveCursor(stream, -5, -3);

    stream.write("stuff at\nthe top");

    readline.moveCursor(stream, 20, 3);

    stream.write(dim("stuff to "));
    stream.write(bold("the side"));

    expect(clean(stream.getOutput())).toMatchInlineSnapshot(`
      stuff at
the top
⧙+⧘--------------⧙+⧘
⧙|⧘ some text    ⧙|⧘
⧙|⧘              ⧙|⧘           ⧙stuff to ⧘⧙the side⧘▊
⧙|⧘              ⧙|⧘
⧙+⧘--------------⧙+⧘
`);
  });

  test("error when out of bounds horizontally", () =>
    new Promise<void>((resolve, reject) => {
      const stream = new CursorWriteStream();

      stream.on("error", (error) => {
        expect(error.message).toMatchInlineSnapshot(
          `Cursor out of bounds: {"x":0,"y":0} + {"dx":-1,"dy":0} = {"x":-1,"y":0}`
        );
        resolve();
      });

      stream.on("close", () => {
        reject(new Error("Expected stream never to close."));
      });

      readline.moveCursor(stream, -1, 0, () => {
        stream.end();
      });
    }));

  test("error when out of bounds vertically", () =>
    new Promise<void>((resolve, reject) => {
      const stream = new CursorWriteStream();

      stream.on("error", (error) => {
        expect(error.message).toMatchInlineSnapshot(
          `Cursor out of bounds: {"x":1,"y":5} + {"dx":0,"dy":-8} = {"x":1,"y":-3}`
        );
        resolve();
      });

      stream.on("close", () => {
        reject(new Error("Expected stream never to close."));
      });

      readline.moveCursor(stream, 9999, 5, () => {
        readline.moveCursor(stream, -9998, -8, () => {
          stream.end();
        });
      });
    }));
});
