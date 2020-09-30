import * as path from "path";

import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

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

  expect(stderr.content).toBe("");
  expect(exitCode).toBe(0);

  return clean(stdout.content);
}

async function validateFailHelper(fixture: string): Promise<string> {
  return validateFailHelperAbsolute(path.join(FIXTURES_DIR, fixture));
}

async function validateFailHelperAbsolute(dir: string): Promise<string> {
  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["validate"], {
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

describe("validate", () => {
  describe("valid", () => {
    test("empty object two levels up", async () => {
      expect(await validateSuccessHelper("empty-object-two-levels-up/one/two"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/empty-object-two-levels-up/elm-tooling.json⧘
        No errors found.

      `);
    });

    test("everything", async () => {
      expect(await validateSuccessHelper("everything")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/everything/elm-tooling.json⧘
        No errors found.

      `);
    });
  });

  describe("invalid", () => {
    test("wrong field types", async () => {
      expect(await validateFailHelper("wrong-field-types"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/wrong-field-types/elm-tooling.json⧘

        ⧘⧙2⧘ errors

        ⧘⧙entrypoints⧘
            Expected an array but got: null

        ⧘⧙tools⧘
            Expected an object but got: ["elm","elm-format"]

        ⧘⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });

    test("empty entrypoints", async () => {
      expect(await validateFailHelper("empty-entrypoints"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/empty-entrypoints/elm-tooling.json⧘

        ⧘⧙1⧘ error

        ⧘⧙entrypoints⧘
            Expected at least one entrypoint but got 0.

        ⧘⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });

    test("kitchen sink", async () => {
      expect(await validateFailHelper("kitchen-sink")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/kitchen-sink/elm-tooling.json⧘

        ⧘⧙13⧘ errors

        ⧘⧙elm.json⧘
            There should be an elm.json next to elm-tooling.json
            File does not exist: /Users/you/project/fixtures/validate/kitchen-sink/elm.json

        ⧘⧙not-a-thing⧘
            Unknown field
            Known fields: entrypoints, tools

        ⧘⧙nope⧘
            Unknown field
            Known fields: entrypoints, tools

        ⧘⧙entrypoints[0]⧘
            Expected the string to start with "./" (to indicate that it is a relative path) but got: "Main.elm"

        ⧘⧙entrypoints[1]⧘
            Expected the string to use only "/" as path delimiter but found "\\": ".\\\\Main.elm"

        ⧘⧙entrypoints[3]⧘
            Duplicate entrypoint: /Users/you/project/fixtures/validate/kitchen-sink/Main.elm

        ⧘⧙entrypoints[4]⧘
            File does not exist: /Users/you/project/fixtures/validate/kitchen-sink/missing/Main.elm

        ⧘⧙entrypoints[5]⧘
            File does not exist: /Users/you/project/fixtures/validate/kitchen-sink/missing/Main.elm

        ⧘⧙entrypoints[6]⧘
            Exists but is not a file: /Users/you/project/fixtures/validate/kitchen-sink/

        ⧘⧙entrypoints[7]⧘
            Expected a string but got: null

        ⧘⧙tools["elm-invalid"]⧘
            Expected a version as a string but got: 1

        ⧘⧙tools["elm-nope"]⧘
            Unknown tool
            Known tools: elm, elm-format, elm-json

        ⧘⧙tools["elm-format"]⧘
            Exists but is not a file: /Users/you/project/fixtures/validate/kitchen-sink/elm-tooling/elm-format/0.8.3/elm-format

        ⧘⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });

    test("unknown versions", async () => {
      expect(await validateFailHelper("unknown-versions"))
        .toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/unknown-versions/elm-tooling.json⧘

        ⧘⧙2⧘ errors

        ⧘⧙tools["elm"]⧘
            Unknown version: v0.19.1
            Known versions: 0.19.0, 0.19.1

        ⧘⧙tools["elm-format"]⧘
            Unknown version: 0.8
            Known versions: 0.8.1, 0.8.2, 0.8.3, 0.8.4

        ⧘⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });

    test("missing tools", async () => {
      expect(await validateFailHelper("missing-tools")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/missing-tools/elm-tooling.json⧘

        ⧘⧙2⧘ errors

        ⧘⧙tools["elm"]⧘
            File does not exist: /Users/you/project/fixtures/validate/missing-tools/elm-tooling/elm/0.19.1/elm

        ⧘⧙tools["elm-format"]⧘
            File does not exist: /Users/you/project/fixtures/validate/missing-tools/elm-tooling/elm-format/0.8.3/elm-format

        ⧘⧙To download missing tools:⧘
            elm-tooling download
            ⧘⧙or:⧘
            elm-tooling postinstall

        ⧘⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });
  });

  describe("errors", () => {
    test("not found", async () => {
      expect(await validateFailHelperAbsolute(path.parse(__dirname).root))
        .toMatchInlineSnapshot(`
        No elm-tooling.json found. To create one: elm-tooling init

      `);
    });

    test("is folder", async () => {
      expect(await validateFailHelper("is-folder")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/is-folder/elm-tooling.json⧘
        Failed to read file as JSON:
        EISDIR: illegal operation on a directory, read

      `);
    });

    test("bad json", async () => {
      expect(await validateFailHelper("bad-json")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/bad-json/elm-tooling.json⧘
        Failed to read file as JSON:
        Unexpected end of JSON input

      `);
    });

    test("not an object", async () => {
      expect(await validateFailHelper("not-an-object")).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/validate/not-an-object/elm-tooling.json⧘
        Expected an object but got: ["tools",{"elm":"0.19.1"}]

      `);
    });
  });
});
