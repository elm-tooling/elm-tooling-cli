import * as path from "path";

import ensure from "../ensure";
import { clean, IS_WINDOWS, stringSnapshotSerializer } from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "ensure");

async function ensureHelper({
  fixture,
  name,
  version,
}: {
  fixture: string;
  name: string;
  version: string;
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
        version: "^0.0.0",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      Unknown tool: elmx
      Known tools: elm, elm-format
    `));

  test("unknown version (range)", () =>
    expect(
      ensureHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: "^1337.1.0",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      No elm versions matching: ^1337.1.0
      Known versions: 0.19.0, 0.19.1
    `));

  test("unknown exact version", () =>
    expect(
      ensureHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: "=0.1.0",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      No elm versions matching: =0.1.0
      Known versions: 0.19.0, 0.19.1
    `));

  test("missing range character", () =>
    expect(
      ensureHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: "0.19.0",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `Version ranges must start with ^ or ~ (or = if you really need an exact version) and be followed by 3 dot-separated numbers, but got: 0.19.0`
    ));

  test("missing semver number", () =>
    expect(
      ensureHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: "^0.19",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `Version ranges must start with ^ or ~ (or = if you really need an exact version) and be followed by 3 dot-separated numbers, but got: ^0.19`
    ));

  test("error finding binary", () => {
    const promise = ensureHelper({
      fixture: "folder-that-actually-is-a-file",
      name: "elm",
      version: "^0.19.1",
    });

    if (IS_WINDOWS) {
      // eslint-disable-next-line jest/no-conditional-expect
      return expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(
        `ENOTDIR: not a directory, mkdir '/Users/you/project/fixtures/ensure/folder-that-actually-is-a-file/elm-tooling/elm/0.19.1'`
      );
    } else {
      // eslint-disable-next-line jest/no-conditional-expect
      return expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(
        `A part of this path exist, but is not a directory (which it needs to be): /Users/you/project/fixtures/ensure/folder-that-actually-is-a-file/elm-tooling/elm/0.19.1`
      );
    }
  });

  test("already downloaded", () =>
    expect(
      ensureHelper({
        fixture: "already-downloaded",
        name: "elm-format",
        version: "^0.8.1-rc1",
      })
    ).resolves.toMatchInlineSnapshot(
      `/Users/you/project/fixtures/ensure/already-downloaded/elm-tooling/elm-format/0.8.4/elm-format`
    ));
});
