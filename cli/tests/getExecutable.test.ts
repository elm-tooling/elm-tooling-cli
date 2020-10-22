import * as path from "path";

import getExecutable from "../getExecutable";
import { getLatestMatchingVersion } from "../helpers/parse";
import { clean, IS_WINDOWS, stringSnapshotSerializer } from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "getExecutable");

async function getExecutableHelper({
  fixture,
  name,
  version,
}: {
  fixture: string;
  name: string;
  version: string;
}): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  return getExecutable({
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

describe("getExecutable", () => {
  test("unknown tool", () =>
    expect(
      getExecutableHelper({
        fixture: "should-not-matter",
        name: "elmx",
        version: "^0.0.0",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      Unknown tool: elmx
      Known tools: elm, elm-format, elm-json
    `));

  test("unknown version (range)", () =>
    expect(
      getExecutableHelper({
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
      getExecutableHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: "=0.1.0",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      No elm versions matching: =0.1.0
      Known versions: 0.19.0, 0.19.1
    `));

  // Change this to use `getExecutableHelper` when we have a prerelease in `KNOWN_TOOLS`.
  test("future prereleases should not match", () =>
    expect(
      getLatestMatchingVersion("^1.0.0-beta.1", [
        "1.1.0-beta.1",
        "1.0.1",
        "1.0.0",
        "1.0.0-beta.1",
      ])
    ).toBe("1.0.1"));

  // Change this to use `getExecutableHelper` when we have a prerelease in `KNOWN_TOOLS`.
  test("too old prerelease should not match", () =>
    expect(
      getLatestMatchingVersion("^1.0.0-beta.2", [
        "1.1.0-beta.1",
        "1.0.0-beta.1",
      ])
    ).toBeUndefined());

  test("missing range character", () =>
    expect(
      getExecutableHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: "0.19.0",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `Version ranges must start with ^ or ~ (or = if you really need an exact version) and be followed by 3 dot-separated numbers, but got: 0.19.0`
    ));

  test("missing semver number", () =>
    expect(
      getExecutableHelper({
        fixture: "should-not-matter",
        name: "elm",
        version: "^0.19",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `Version ranges must start with ^ or ~ (or = if you really need an exact version) and be followed by 3 dot-separated numbers, but got: ^0.19`
    ));

  test("error finding executable", () => {
    const promise = getExecutableHelper({
      fixture: "folder-that-actually-is-a-file",
      name: "elm",
      version: "^0.19.1",
    });

    if (IS_WINDOWS) {
      // eslint-disable-next-line jest/no-conditional-expect
      return expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(
        `ENOTDIR: not a directory, mkdir '/Users/you/project/fixtures/getExecutable/folder-that-actually-is-a-file/elm-tooling/elm/0.19.1'`
      );
    } else {
      // eslint-disable-next-line jest/no-conditional-expect
      return expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(
        `A part of this path exist, but is not a directory (which it needs to be): /Users/you/project/fixtures/getExecutable/folder-that-actually-is-a-file/elm-tooling/elm/0.19.1`
      );
    }
  });

  test("already downloaded", () =>
    expect(
      getExecutableHelper({
        fixture: "already-downloaded",
        name: "elm-format",
        version: "^0.8.1-rc1",
      })
    ).resolves.toMatchInlineSnapshot(
      `/Users/you/project/fixtures/getExecutable/already-downloaded/elm-tooling/elm-format/0.8.4/elm-format`
    ));
});
