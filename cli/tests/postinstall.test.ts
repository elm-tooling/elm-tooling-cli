import * as path from "path";

import type { Env } from "../helpers/mixed";
import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "postinstall");

async function postinstallSuccessHelper(
  fixture: string,
  env?: Env
): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["postinstall"], {
    cwd: dir,
    env: { ELM_HOME: dir, ...env },
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

  test("nothing to do (NO_ELM_TOOLING_POSTINSTALL)", async () => {
    expect(
      await postinstallSuccessHelper("would-download", {
        NO_ELM_TOOLING_POSTINSTALL: "",
      })
    ).toMatchInlineSnapshot(``);
  });
});
