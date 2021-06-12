import elmToolingCli from "../src";
import {
  assertExitCode,
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./Helpers";

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

  assertExitCode(1, exitCode, stdout.content, stderr.content);
  expect(stdout.content).toBe("");

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
