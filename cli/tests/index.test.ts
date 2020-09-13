import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  FailWriteStream,
  MemoryWriteStream,
} from "./helpers";

async function indexHelper(args: Array<string>): Promise<string> {
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(args, {
    cwd: __dirname,
    env: {},
    stdin: new FailReadStream(),
    stdout: new FailWriteStream(),
    stderr,
  });

  expect(exitCode).toBe(1);

  return clean(stderr.content);
}

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
expect.addSnapshotSerializer({
  test: (value) => typeof value === "string",
  print: String,
});

describe("index", () => {
  test("unknown command", async () => {
    expect(await indexHelper(["nope"])).toMatchInlineSnapshot(`
      Unknown command: nope

    `);
  });

  test("too many arguments", async () => {
    // Currently this is handled regardless of the command.
    expect(await indexHelper(["whatever", "--target", ".elm", "--silent"]))
      .toMatchInlineSnapshot(`
      Expected a single argument but got: --target .elm --silent

    `);
  });
});
