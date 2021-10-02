import elmToolingCli from "../src";
import {
  assertExitCode,
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./Helpers";

async function validateSuccessHelper(): Promise<string> {
  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["validate"], {
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  assertExitCode(0, exitCode, stdout.content, stderr.content);
  expect(stderr.content).toBe("");

  return clean(stdout.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("validate", () => {
  test("just prints a message", async () => {
    expect(await validateSuccessHelper()).toMatchInlineSnapshot(`
      The \`validate\` command no longer exists.
      If you have "entrypoints" you can remove that field.
      To validate "tools": elm-tooling install

    `);
  });
});
