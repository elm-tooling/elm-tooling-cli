import * as fs from "fs";
import * as path from "path";

import type { ElmTooling } from "../helpers/mixed";
import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "init");

async function initSuccessHelper(
  fixture: string
): Promise<{ stdout: string; json: string }> {
  const dir = path.join(FIXTURES_DIR, fixture);
  const elmToolingJsonPath = path.join(dir, "elm-tooling.json");
  try {
    fs.unlinkSync(elmToolingJsonPath);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["init"], {
    cwd: dir,
    env: {},
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  expect(stderr.content).toBe("");
  expect(exitCode).toBe(0);

  return {
    stdout: clean(stdout.content),
    json: fs.readFileSync(elmToolingJsonPath, "utf8"),
  };
}

async function initFailHelper(fixture: string): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["init"], {
    cwd: dir,
    env: {},
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  expect(stdout.content).toBe("");
  expect(exitCode).toBe(1);

  return clean(stderr.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("init", () => {
  test("packages don’t get entrypoints", async () => {
    const { stdout, json } = await initSuccessHelper("package");

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/init/package/elm-tooling.json⧘
      Created! Open it in a text editor and have a look!

    `);

    expect(json).toMatchInlineSnapshot(`
      {
          "tools": {
              "elm": "0.19.1",
              "elm-format": "0.8.4",
              "elm-json": "0.2.8"
          }
      }

    `);
  });

  test("application entrypoints are detected", async () => {
    const { stdout, json } = await initSuccessHelper("application");

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/init/application/elm-tooling.json⧘
      Created! Open it in a text editor and have a look!

    `);

    expect(json).toMatchInlineSnapshot(`
      {
          "entrypoints": [
              "./legacy/elm/Main.elm",
              "./src/App.elm"
          ],
          "tools": {
              "elm": "0.19.1",
              "elm-format": "0.8.4",
              "elm-json": "0.2.8"
          }
      }

    `);
  });

  test.each([
    "bad-elm-json-source-directories",
    "bad-elm-json-type",
    "bad-elm-json",
    "empty-elm-json-source-directories",
    "no-elm-json",
    "no-files-with-main",
    "not-an-object",
  ])("Uses fallback for %s", async (fixture) => {
    const { stdout, json } = await initSuccessHelper(fixture);

    expect(stdout).not.toHaveLength(0);

    expect((JSON.parse(json) as ElmTooling).entrypoints).toStrictEqual([
      "./src/Main.elm",
    ]);
  });

  test("already exists", async () => {
    expect(await initFailHelper("already-exists")).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/init/already-exists/elm-tooling.json⧘
      Already exists!

    `);
  });

  test("already exists as folder", async () => {
    expect(await initFailHelper("already-exists-as-folder"))
      .toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/init/already-exists-as-folder/elm-tooling.json⧘
      Already exists!

    `);
  });
});
