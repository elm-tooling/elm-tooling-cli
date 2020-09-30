import * as path from "path";

import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "download");

async function downloadSuccessHelper(fixture: string): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["download"], {
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

async function downloadFailHelper(fixture: string): Promise<string> {
  return downloadFailHelperAbsolute(path.join(FIXTURES_DIR, fixture));
}

async function downloadFailHelperAbsolute(dir: string): Promise<string> {
  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["download"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  expect(stdout.content).toBe("");
  expect(exitCode).toBe(1);

  return clean(stderr.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("download", () => {
  describe("nothing to do", () => {
    test("empty object two levels up", async () => {
      expect(await downloadSuccessHelper("empty-object-two-levels-up/one/two"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/empty-object-two-levels-up/elm-tooling.json⧘
        The "tools" field is missing. Nothing to download.

      `);
    });

    test("empty tools field", async () => {
      expect(await downloadSuccessHelper("empty-tools-field"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/empty-tools-field/elm-tooling.json⧘
        The "tools" field is empty. Nothing to download.

      `);
    });

    test("already downloaded", async () => {
      expect(await downloadSuccessHelper("already-downloaded"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/already-downloaded/elm-tooling.json⧘
        ⧘⧙elm 0.19.1⧘ already exists: ⧘⧙/Users/you/project/fixtures/download/already-downloaded/elm-tooling/elm/0.19.1/elm⧘
        ⧘⧙elm-format 0.8.3⧘ already exists: ⧘⧙/Users/you/project/fixtures/download/already-downloaded/elm-tooling/elm-format/0.8.3/elm-format⧘

      `);
    });
  });

  describe("invalid", () => {
    test("wrong field type (ignores errors for other fields)", async () => {
      expect(await downloadFailHelper("wrong-field-types"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/wrong-field-types/elm-tooling.json⧘

        ⧘⧙1⧘ error

        ⧘⧙tools⧘
            Expected an object but got: ["elm","elm-format"]

        ⧘⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });

    test("unknown tools/versions", async () => {
      expect(await downloadFailHelper("unknown")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/unknown/elm-tooling.json⧘

        ⧘⧙2⧘ errors

        ⧘⧙tools["elm-compiler"]⧘
            Unknown tool
            Known tools: elm, elm-format, elm-json

        ⧘⧙tools["elm-format"]⧘
            Unknown version: 0.8
            Known versions: 0.8.1, 0.8.2, 0.8.3, 0.8.4

        ⧘⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });
  });

  describe("errors", () => {
    test("not found", async () => {
      expect(await downloadFailHelperAbsolute(path.parse(__dirname).root))
        .toMatchInlineSnapshot(`
        No elm-tooling.json found. To create one: elm-tooling init

      `);
    });

    test("is folder", async () => {
      expect(await downloadFailHelper("is-folder")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/is-folder/elm-tooling.json⧘
        Failed to read file as JSON:
        EISDIR: illegal operation on a directory, read

      `);
    });

    test("bad json", async () => {
      expect(await downloadFailHelper("bad-json")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/bad-json/elm-tooling.json⧘
        Failed to read file as JSON:
        Unexpected end of JSON input

      `);
    });

    test("not an object", async () => {
      expect(await downloadFailHelper("not-an-object")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/download/not-an-object/elm-tooling.json⧘
        Expected an object but got: ["tools",{"elm":"0.19.1"}]

      `);
    });
  });
});
