import * as fs from "fs";
import * as path from "path";

import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  FailWriteStream,
  MemoryWriteStream,
} from "./helpers";

async function initSuccessHelper(
  fixture: string
): Promise<{ stdout: string; json: string }> {
  const dir = path.join(__dirname, "fixtures", fixture);
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

  const exitCode = await elmToolingCli(["init"], {
    cwd: dir,
    env: {},
    stdin: new FailReadStream(),
    stdout,
    stderr: new FailWriteStream(),
  });

  expect(exitCode).toBe(0);

  return {
    stdout: clean(stdout.content),
    json: fs.readFileSync(elmToolingJsonPath, "utf8"),
  };
}

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
expect.addSnapshotSerializer({
  test: (value) => typeof value === "string",
  print: String,
});

describe("init", () => {
  test("packages don’t get entrypoints", async () => {
    const { stdout, json } = await initSuccessHelper("package");

    expect(stdout).toMatchInlineSnapshot(`
      ⧘⧙/Users/you/project/fixtures/package/elm-tooling.json⧘
      Created! Open it in a text editor and have a look!

    `);

    expect(json).toMatchInlineSnapshot(`
      {
          "tools": {
              "elm": "0.19.1",
              "elm-format": "0.8.3"
          }
      }

    `);
  });
});
