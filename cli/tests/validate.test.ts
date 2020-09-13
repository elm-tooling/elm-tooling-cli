import * as path from "path";

import elmToolingCli from "../index";
import { clean, FailReadStream, MemoryWriteStream } from "./helpers";

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

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
expect.addSnapshotSerializer({
  test: (value) => typeof value === "string",
  print: String,
});

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
  });

  describe("errors", () => {
    test("not found", async () => {
      expect(await validateFailHelperAbsolute(path.parse(__dirname).root))
        .toMatchInlineSnapshot(`
        No elm-tooling.json found. To create one: elm-tooling init

      `);
    });
  });
});
