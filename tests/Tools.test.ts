import * as fs from "fs";
import * as path from "path";

import elmToolingCli from "../src";
import {
  assertExitCode,
  clean,
  CursorWriteStream,
  FailReadStream,
  MemoryWriteStream,
  RawReadStream,
  readFile,
  stringSnapshotSerializer,
} from "./Helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "tools");

async function toolsSuccessHelper(
  fixture: string,
  chars: Array<string>
): Promise<{ stdout: string; json: string }> {
  const dir = path.join(FIXTURES_DIR, fixture);
  const elmToolingJsonPath = path.join(dir, "elm-tooling.json");
  const original = readFile(elmToolingJsonPath);

  const stdout = new CursorWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["tools"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin: new RawReadStream(chars),
    stdout,
    stderr,
  });

  const json = readFile(elmToolingJsonPath);

  if (json !== original) {
    fs.writeFileSync(elmToolingJsonPath, original);
  }

  const stdoutString = stdout.getOutput();

  assertExitCode(0, exitCode, stdoutString, stderr.content);
  expect(stderr.content).toBe("");

  return {
    stdout: clean(stdoutString),
    json,
  };
}

async function toolsFailHelper(
  fixture: string,
  options?: { isTTY?: boolean }
): Promise<string> {
  return toolsFailHelperAbsolute(path.join(FIXTURES_DIR, fixture), options);
}

async function toolsFailHelperAbsolute(
  dir: string,
  { isTTY = true }: { isTTY?: boolean } = {}
): Promise<string> {
  const stdin = new FailReadStream();
  stdin.isTTY = isTTY;
  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["tools"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin,
    stdout,
    stderr,
  });

  assertExitCode(1, exitCode, stdout.content, stderr.content);
  expect(stdout.content).toBe("");

  return clean(stderr.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("tools", () => {
  test("default cursor position when no tools", async () => {
    const { stdout, json } = await toolsSuccessHelper("empty-elm-tooling", [
      "test-exit",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/empty-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘▊⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
    `);

    expect(json).toMatchInlineSnapshot(`
      {}

    `);
  });

  test("default cursor position when tools are provided", async () => {
    const { stdout, json } = await toolsSuccessHelper("some-elm-tooling", [
      "test-exit",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/some-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘⧙☒⧘⧙]⧘ 0.8.3
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘⧙x⧘⧙]⧘ 0.2.8
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
    `);

    expect(json).toMatchInlineSnapshot(`
      {
        "tools": {
          "elm-json": "0.2.8",
          "elm-format": "0.8.3"
        }
      }

    `);
  });

  test("move cursor up past the edge", async () => {
    const { stdout, json } = await toolsSuccessHelper("empty-elm-tooling", [
      ...Array.from({ length: 100 }, () => "\x1B[A"),
      "test-exit",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/empty-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘▊⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
    `);

    expect(json).toMatchInlineSnapshot(`
      {}

    `);
  });

  test("move cursor down past the edge", async () => {
    const { stdout, json } = await toolsSuccessHelper("empty-elm-tooling", [
      ...Array.from({ length: 100 }, () => "\x1B[B"),
      "test-exit",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/empty-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘▊⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
    `);

    expect(json).toMatchInlineSnapshot(`
      {}

    `);
  });

  test("moves cursor to the end on exit", async () => {
    const fixture = "empty-elm-tooling";
    const { stdout, json } = await toolsSuccessHelper(fixture, ["q"]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/empty-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save

      Nothing changed.
      ▊
    `);

    expect(json).toMatchInlineSnapshot(`
      {}

    `);

    expect(await toolsSuccessHelper(fixture, ["\x03"])).toEqual({
      stdout,
      json,
    });
  });

  test("moves cursor to the end on unchanged save", async () => {
    const fixture = "some-elm-tooling";
    const { stdout, json } = await toolsSuccessHelper(fixture, [
      "x",
      "x",
      "\r",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/some-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘⧙x⧘⧙]⧘ 0.8.3
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘⧙x⧘⧙]⧘ 0.2.8
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save

      Nothing changed.
      ▊
    `);

    // Should be unchanged.
    expect(json).toMatchInlineSnapshot(`
      {
        "tools": {
          "elm-json": "0.2.8",
          "elm-format": "0.8.3"
        }
      }

    `);
  });

  test("toggle then exit", async () => {
    const fixture = "some-elm-tooling";
    const { stdout, json } = await toolsSuccessHelper(fixture, ["x", "q"]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/some-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘⧙x⧘⧙]⧘ 0.2.8
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save

      Nothing changed.
      ▊
    `);

    // Should be unchanged.
    expect(json).toMatchInlineSnapshot(`
      {
        "tools": {
          "elm-json": "0.2.8",
          "elm-format": "0.8.3"
        }
      }

    `);
  });

  test("change elm version", async () => {
    const { stdout, json } = await toolsSuccessHelper("change-elm-version", [
      "j",
      "k",
      "k",
      " ",
      "\r",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/change-elm-version/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘⧙x⧘⧙]⧘ 0.19.0
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save

      Saved! To install: elm-tooling install
      ▊
    `);

    // Other fields are preserved and the order is unchanged.
    expect(json).toMatchInlineSnapshot(`
      {
          "before": 1,
          "tools": {
              "elm": "0.19.0"
          },
          "after": 2
      }

    `);
  });

  test("removing last tool removes the entire field", async () => {
    const { stdout, json } = await toolsSuccessHelper("remove-last-tool", [
      "o",
      "\r",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/remove-last-tool/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save

      Saved! To unlink: elm-tooling install
      ▊
    `);

    expect(json).toMatchInlineSnapshot(`
      {
          "entrypoints": [
              "./src/Main.elm"
          ]
      }

    `);
  });

  test("pressing some other key does nothing", async () => {
    const { stdout, json } = await toolsSuccessHelper("empty-elm-tooling", [
      "ä",
      "test-exit",
    ]);

    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/empty-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘▊⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

      ⧙elm-test-rs⧘
        ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
        ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
    `);

    expect(json).toMatchInlineSnapshot(`
      {}

    `);
  });

  describe("errors", () => {
    test("not a tty", async () => {
      expect(await toolsFailHelper("does-not-exist", { isTTY: false }))
        .toMatchInlineSnapshot(`
              This command requires stdin to be a TTY.

          `);
    });

    test("not found", async () => {
      expect(await toolsFailHelperAbsolute(path.parse(__dirname).root))
        .toMatchInlineSnapshot(`
        No elm-tooling.json found. To create one: elm-tooling init

      `);
    });

    test("bad json", async () => {
      expect(await toolsFailHelper("bad-json")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/tools/bad-json/elm-tooling.json⧘
        Failed to read file as JSON:
        Unexpected end of JSON input

      `);
    });

    test("unknown tools/versions", async () => {
      expect(await toolsFailHelper("unknown")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/tools/unknown/elm-tooling.json⧘

        ⧙2⧘ errors

        ⧙tools["elm-compiler"]⧘
            Unknown tool
            Known tools: elm, elm-format, elm-json, elm-test-rs

        ⧙tools["elm-format"]⧘
            Unknown version: 0.8
            Known versions: 0.8.1, 0.8.2, 0.8.3, 0.8.4, 0.8.5

        ⧙Specification:⧘
            https://elm-tooling.github.io/elm-tooling-cli/spec

      `);
    });

    test("readonly", async () => {
      const dir = path.join(FIXTURES_DIR, "readonly");
      const elmToolingJsonPath = path.join(dir, "elm-tooling.json");
      fs.chmodSync(elmToolingJsonPath, "0444"); // readonly

      const stdout = new CursorWriteStream();
      const stderr = new MemoryWriteStream();

      const exitCode = await elmToolingCli(["tools"], {
        cwd: dir,
        env: { ELM_HOME: dir },
        stdin: new RawReadStream(["x", "\r"]),
        stdout,
        stderr,
      });

      const stdoutString = stdout.getOutput();

      assertExitCode(1, exitCode, stdoutString, stderr.content);

      expect(clean(stdoutString)).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/tools/readonly/elm-tooling.json⧘

        ⧙elm⧘
          ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
          ⧙[⧘⧙x⧘⧙]⧘ 0.19.1

        ⧙elm-format⧘
          ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
          ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
          ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
          ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘
          ⧙[⧘ ⧙]⧘ ⧙0.8.5⧘

        ⧙elm-json⧘
          ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘
          ⧙[⧘ ⧙]⧘ ⧙0.2.10⧘

        ⧙elm-test-rs⧘
          ⧙[⧘ ⧙]⧘ ⧙1.0.0⧘
          ⧙[⧘ ⧙]⧘ ⧙1.2.1⧘
          ⧙[⧘ ⧙]⧘ ⧙1.2.2⧘

        ⧙Up⧘/⧙Down⧘ to move
        ⧙Space⧘ to toggle
        ⧙Enter⧘ to save
        ▊
      `);

      // Fails with EPERM on Windows, but EACCESS on Linux and Mac.
      const stderrContent = clean(stderr.content).replace(
        /(EPERM|EACCES):[^']*/g,
        "EACCES: fake error "
      );

      expect(stderrContent).toMatchInlineSnapshot(`
        Failed to save: EACCES: fake error '/Users/you/project/fixtures/tools/readonly/elm-tooling.json'

      `);
    });
  });
});
