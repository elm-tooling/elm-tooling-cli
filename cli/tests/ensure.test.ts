import * as path from "path";

import ensure from "../ensure";
import { clean, stringSnapshotSerializer } from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "ensure");

async function ensureHelper({
  fixture,
  name,
  version,
}: {
  fixture: string;
  name: string;
  version: RegExp;
}): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  return ensure({
    name,
    version,
    cwd: dir,
    env: { ELM_HOME: dir },
    onProgress: () => {
      throw new Error("Expected onProgress not to be called");
    },
  }).then(clean, (error: Error) =>
    Promise.reject(new Error(clean(error.message)))
  );
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("ensure", () => {
  test("unknown tool", () =>
    expect(
      ensureHelper({
        fixture: "should-not-matter",
        name: "elmx",
        version: /x/,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      Unknown tool: elmx
      Known tools: elm, elm-format
    `));

  test("unknown version", () =>
    expect(
      ensureHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: /^v0\.19\./,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      No elm versions matching: /^v0\\.19\\./
      Known versions: 0.19.0, 0.19.1
    `));

  test("error finding binary", () =>
    expect(
      ensureHelper({
        fixture: "folder-that-actually-is-a-file",
        name: "elm",
        version: /^/,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `A part of this path exist, but is not a directory (which it needs to be): /Users/you/project/fixtures/ensure/folder-that-actually-is-a-file/elm-tooling/elm/0.19.1`
    ));

  test("already downloaded", () =>
    expect(
      ensureHelper({
        fixture: "already-downloaded",
        name: "elm",
        version: /^0\.19\.1$/,
      })
    ).resolves.toMatchInlineSnapshot(
      `/Users/you/project/fixtures/ensure/already-downloaded/elm-tooling/elm/0.19.1/elm`
    ));
});
