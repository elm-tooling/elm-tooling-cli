import * as path from "path";

import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "postinstall");

async function postinstallSuccessHelper(fixture: string): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["postinstall"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  expect(stderr.content).toBe("");
  expect(exitCode).toBe(0);

  return clean(stdout.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("postinstall", () => {
  test("nothing to do (empty tools field)", async () => {
    expect(await postinstallSuccessHelper("empty-tools-field"))
      .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/postinstall/empty-tools-field/elm-tooling.json⧘
        The "tools" field is empty. Nothing to download.

      `);
  });
});
