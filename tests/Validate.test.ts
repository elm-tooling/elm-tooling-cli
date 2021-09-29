import * as path from "path";

import elmToolingCli from "../src";
import {
  assertExitCode,
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./Helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "validate");

async function validateSuccessHelper(fixture: string): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["validate"], {
    cwd: dir,
    env: { ELM_HOME: dir },
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
    expect(await validateSuccessHelper("empty-object-two-levels-up/one/two"))
      .toMatchInlineSnapshot(`
      The \`validate\` command no longer exists.
      If you have "entrypoints" you can remove that field.
      To validate "tools": elm-tooling install

    `);
  });
});
