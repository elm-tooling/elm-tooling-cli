import * as fs from "fs";
import * as path from "path";

import type { ElmTooling } from "../helpers/mixed";
import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  readFile,
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
    json: readFile(elmToolingJsonPath),
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
      To install tools: elm-tooling install

    `);

    expect(json).toMatchInlineSnapshot(`
      {
          "tools": {
              "elm": "0.19.1",
              "elm-format": "0.8.5",
              "elm-json": "0.2.10"
          }
      }

    `);
  });

  test("application entrypoints are detected", async () => {
    const { stdout, json } = await initSuccessHelper("application");

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/init/application/elm-tooling.json⧘
      Created! Open it in a text editor and have a look!
      To install tools: elm-tooling install

    `);

    expect(json).toMatchInlineSnapshot(`
      {
          "entrypoints": [
              "./legacy/elm/Main.elm",
              "./src/App.elm"
          ],
          "tools": {
              "elm": "0.19.1",
              "elm-format": "0.8.5",
              "elm-json": "0.2.10"
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

  describe("tools in node_modules are detected", () => {
    test("exact version, version with suffix and missing tool", async () => {
      const { stdout, json } = await initSuccessHelper(
        "some-tools-in-node_modules"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/some-tools-in-node_modules/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
          {
              "entrypoints": [
                  "./src/Main.elm"
              ],
              "tools": {
                  "elm": "0.19.1",
                  "elm-format": "0.8.3"
              }
          }

      `);
    });

    test("semver resolution", async () => {
      const { stdout, json } = await initSuccessHelper(
        "semver-in-node_modules"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/semver-in-node_modules/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "entrypoints": [
                "./src/Main.elm"
            ],
            "tools": {
                "elm-json": "0.2.10"
            }
        }

      `);
    });

    test("bad package.json in node_modules are ignored", async () => {
      const { stdout, json } = await initSuccessHelper(
        "bad-package-json-in-node_modules"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/bad-package-json-in-node_modules/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "entrypoints": [
                "./src/Main.elm"
            ],
            "tools": {
                "elm": "0.19.1",
                "elm-format": "0.8.5",
                "elm-json": "0.2.10"
            }
        }

      `);
    });
  });

  describe("elm-version in elm.json is detected", () => {
    test("bad elm-version for application is ignored", async () => {
      const { stdout, json } = await initSuccessHelper(
        "bad-elm-json-elm-version-application"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/bad-elm-json-elm-version-application/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "entrypoints": [
                "./src/Main.elm"
            ],
            "tools": {
                "elm": "0.19.1",
                "elm-format": "0.8.5",
                "elm-json": "0.2.10"
            }
        }

      `);
    });

    test("bad elm-version for package is ignored", async () => {
      const { stdout, json } = await initSuccessHelper(
        "bad-elm-json-elm-version-package"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/bad-elm-json-elm-version-package/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "tools": {
                "elm": "0.19.1",
                "elm-format": "0.8.5",
                "elm-json": "0.2.10"
            }
        }

      `);
    });

    test("unknown elm-version for application is ignored", async () => {
      const { stdout, json } = await initSuccessHelper(
        "unknown-elm-version-application"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/unknown-elm-version-application/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "entrypoints": [
                "./src/Main.elm"
            ],
            "tools": {
                "elm": "0.19.1",
                "elm-format": "0.8.5",
                "elm-json": "0.2.10"
            }
        }

      `);
    });

    test("unknown elm-version for package is ignored", async () => {
      const { stdout, json } = await initSuccessHelper(
        "unknown-elm-version-package"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/unknown-elm-version-package/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "tools": {
                "elm": "0.19.1",
                "elm-format": "0.8.5",
                "elm-json": "0.2.10"
            }
        }

      `);
    });

    test("unknown elm.json type is ignored", async () => {
      const { stdout, json } = await initSuccessHelper(
        "bad-elm-json-type-with-elm-version"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/bad-elm-json-type-with-elm-version/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "entrypoints": [
                "./src/Main.elm"
            ],
            "tools": {
                "elm": "0.19.1",
                "elm-format": "0.8.5",
                "elm-json": "0.2.10"
            }
        }

      `);
    });

    test("elm-version from elm.json wins over node_modules for application", async () => {
      const { stdout, json } = await initSuccessHelper(
        "elm-version-application"
      );

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/elm-version-application/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "entrypoints": [
                "./src/Main.elm"
            ],
            "tools": {
                "elm": "0.19.1"
            }
        }

      `);
    });

    test("elm-version from elm.json wins over node_modules for package", async () => {
      const { stdout, json } = await initSuccessHelper("elm-version-package");

      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/init/elm-version-package/elm-tooling.json⧘
        Created! Open it in a text editor and have a look!
        To install tools: elm-tooling install

      `);

      expect(json).toMatchInlineSnapshot(`
        {
            "tools": {
                "elm": "0.19.1"
            }
        }

      `);
    });
  });
});
