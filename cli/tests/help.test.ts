import type { Env } from "../helpers/mixed";
import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  FailWriteStream,
  MemoryWriteStream,
} from "./helpers";

async function helpHelper(env: Env): Promise<string> {
  const stdout = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["help"], {
    cwd: __dirname,
    env,
    stdin: new FailReadStream(),
    stdout,
    stderr: new FailWriteStream(),
  });

  expect(exitCode).toBe(0);

  return clean(stdout.content);
}

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
expect.addSnapshotSerializer({
  test: (value) => typeof value === "string",
  print: String,
});

describe("help", () => {
  test("default", async () => {
    expect(await helpHelper({})).toMatchInlineSnapshot(`
      ⧘⧙elm-tooling init⧘
          Create a sample elm-tooling.json in the current directory

      ⧘⧙elm-tooling validate⧘
          Validate the closest elm-tooling.json

      ⧘⧙elm-tooling download⧘
          Download the tools in the closest elm-tooling.json to:
          ⧘⧙/Users/lydell/.elm/elm-tooling⧘

      ⧘⧙elm-tooling postinstall⧘
          Download the tools in the closest elm-tooling.json
          and create links to them in node_modules/.bin/

      ⧘⧙Environment variables:⧘
          ⧘⧙ELM_HOME⧘
              Customize where tools will be downloaded.
              The Elm compiler uses this variable too for where to store packages.

          ⧘⧙NO_ELM_TOOLING_POSTINSTALL⧘
              Disable the postinstall command.

          ⧘⧙NO_COLOR⧘
              Disable colored output.

      ⧘⧙Documentation:⧘
          https://github.com/lydell/elm-tooling.json/tree/master/cli

    `);
  });

  test("NO_COLOR and ELM_HOME", async () => {
    expect(await helpHelper({ NO_COLOR: "", ELM_HOME: "/test" }))
      .toMatchInlineSnapshot(`
      elm-tooling init
          Create a sample elm-tooling.json in the current directory

      elm-tooling validate
          Validate the closest elm-tooling.json

      elm-tooling download
          Download the tools in the closest elm-tooling.json to:
          /test/elm-tooling

      elm-tooling postinstall
          Download the tools in the closest elm-tooling.json
          and create links to them in node_modules/.bin/

      Environment variables:
          ELM_HOME
              Customize where tools will be downloaded.
              The Elm compiler uses this variable too for where to store packages.

          NO_ELM_TOOLING_POSTINSTALL
              Disable the postinstall command.

          NO_COLOR
              Disable colored output.

      Documentation:
          https://github.com/lydell/elm-tooling.json/tree/master/cli

    `);
  });
});
