import * as path from "path";

import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  FailWriteStream,
  MemoryWriteStream,
} from "./helpers";

// async function validateSuccessHelper(fixture: string): Promise<string> {
//   const dir = path.join(__dirname, "fixtures", fixture);

//   const stdout = new MemoryWriteStream();

//   const exitCode = await elmToolingCli(["validate"], {
//     cwd: dir,
//     env: { ELM_HOME: dir },
//     stdin: new FailReadStream(),
//     stdout,
//     stderr: new FailWriteStream(),
//   });

//   expect(exitCode).toBe(0);

//   return clean(stdout.content);
// }

// async function validateFailHelper(fixture: string): Promise<string> {
//   return validateFailHelperAbsolute(path.join(__dirname, "fixtures", fixture));
// }

async function validateFailHelperAbsolute(dir: string): Promise<string> {
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["validate"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin: new FailReadStream(),
    stdout: new FailWriteStream(),
    stderr,
  });

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
    // TODO
  });

  describe("invalid", () => {
    // TODO
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
