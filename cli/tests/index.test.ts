import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

async function indexHelper(args: Array<string>): Promise<string> {
  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(args, {
    cwd: __dirname,
    env: {},
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  expect(stdout.content).toBe("");
  expect(exitCode).toBe(1);

  return clean(stderr.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

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
