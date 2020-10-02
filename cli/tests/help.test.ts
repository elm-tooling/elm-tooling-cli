import type { Env } from "../helpers/mixed";
import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

async function helpHelper(args: Array<string>, env: Env): Promise<string> {
  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(args, {
    cwd: __dirname,
    env,
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  expect(stderr.content).toBe("");
  expect(exitCode).toBe(0);

  return clean(stdout.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("help", () => {
  test("default", async () => {
    const env = { ELM_HOME: "/Users/you/.elm" };
    const output = await helpHelper(["help"], env);

    expect(output).toMatchInlineSnapshot(`
      ⧘⧙elm-tooling init⧘
          Create a sample elm-tooling.json in the current directory

      ⧘⧙elm-tooling validate⧘
          Validate the closest elm-tooling.json

      ⧘⧙elm-tooling install⧘
          Download the tools in the closest elm-tooling.json to:
          ⧘⧙/Users/you/.elm/elm-tooling⧘
          And create links to them in node_modules/.bin/

      ⧘⧙npx elm --help⧘
          Example on how to run installed tools

      ⧘⧙---⧘

      ⧘⧙Environment variables:⧘
          ⧘⧙ELM_HOME⧘
              Customize where tools will be downloaded.
              The Elm compiler uses this variable too for where to store packages.

          ⧘⧙NO_ELM_TOOLING_INSTALL⧘
              Disable the install command.

          ⧘⧙NO_COLOR⧘
              Disable colored output.

      ⧘⧙Documentation:⧘
          https://github.com/lydell/elm-tooling.json/tree/main/cli#readme

      ⧘⧙Version:⧘
          %VERSION%

    `);

    expect(await helpHelper([], env)).toBe(output);
    expect(await helpHelper(["-h"], env)).toBe(output);
    expect(await helpHelper(["-help"], env)).toBe(output);
    expect(await helpHelper(["--help"], env)).toBe(output);
  });

  test("NO_COLOR", async () => {
    expect(await helpHelper(["help"], { NO_COLOR: "", ELM_HOME: "/test" }))
      .toMatchInlineSnapshot(`
      elm-tooling init
          Create a sample elm-tooling.json in the current directory

      elm-tooling validate
          Validate the closest elm-tooling.json

      elm-tooling install
          Download the tools in the closest elm-tooling.json to:
          /test/elm-tooling
          And create links to them in node_modules/.bin/

      npx elm --help
          Example on how to run installed tools

      ---

      Environment variables:
          ELM_HOME
              Customize where tools will be downloaded.
              The Elm compiler uses this variable too for where to store packages.

          NO_ELM_TOOLING_INSTALL
              Disable the install command.

          NO_COLOR
              Disable colored output.

      Documentation:
          https://github.com/lydell/elm-tooling.json/tree/main/cli#readme

      Version:
          %VERSION%

    `);
  });
});
