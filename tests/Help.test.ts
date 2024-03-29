import elmToolingCli from "../src";
import type { Env } from "../src/Helpers";
import {
  assertExitCode,
  clean,
  FailReadStream,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./Helpers";

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

  assertExitCode(0, exitCode, stdout.content, stderr.content);
  expect(stderr.content).toBe("");

  return clean(stdout.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("help", () => {
  test("default", async () => {
    const env = { ELM_HOME: "/Users/you/.elm" };
    const output = await helpHelper(["help"], env);

    expect(output).toMatchInlineSnapshot(`
      ⧙elm-tooling init⧘
          Create a sample elm-tooling.json in the current directory

      ⧙elm-tooling tools⧘
          Add, remove and update tools

      ⧙elm-tooling install⧘
          Download the tools in the closest elm-tooling.json to:
          ⧙/Users/you/.elm/elm-tooling⧘
          And create links to them in node_modules/.bin/

      ⧙npx elm --help⧘
          Example on how to run installed tools

      ⧙---⧘

      ⧙Environment variables:⧘
          ⧙ELM_HOME⧘
              Customize where tools will be downloaded
              (The Elm compiler uses this variable too for where to store packages.)

          ⧙NO_ELM_TOOLING_INSTALL⧘
              Disable the install command

          ⧙NO_COLOR⧘
              Disable colored output

      ⧙Documentation:⧘
          https://elm-tooling.github.io/elm-tooling-cli/cli

      ⧙Version:⧘
          %VERSION%

    `);

    expect(await helpHelper([], env)).toBe(output);
    expect(await helpHelper(["-h"], env)).toBe(output);
    expect(await helpHelper(["-help"], env)).toBe(output);
    expect(await helpHelper(["--help"], env)).toBe(output);
    expect(await helpHelper(["whatever", "-h"], env)).toBe(output);
    expect(await helpHelper(["whatever", "-help"], env)).toBe(output);
    expect(await helpHelper(["whatever", "--help"], env)).toBe(output);
    expect(await helpHelper(["-h", "whatever"], env)).toBe(output);
    expect(await helpHelper(["-help", "whatever"], env)).toBe(output);
    expect(await helpHelper(["--help", "whatever"], env)).toBe(output);
  });

  test("NO_COLOR", async () => {
    expect(await helpHelper(["help"], { NO_COLOR: "", ELM_HOME: "/test" }))
      .toMatchInlineSnapshot(`
      elm-tooling init
          Create a sample elm-tooling.json in the current directory

      elm-tooling tools
          Add, remove and update tools

      elm-tooling install
          Download the tools in the closest elm-tooling.json to:
          /test/elm-tooling
          And create links to them in node_modules/.bin/

      npx elm --help
          Example on how to run installed tools

      ---

      Environment variables:
          ELM_HOME
              Customize where tools will be downloaded
              (The Elm compiler uses this variable too for where to store packages.)

          NO_ELM_TOOLING_INSTALL
              Disable the install command

          NO_COLOR
              Disable colored output

      Documentation:
          https://elm-tooling.github.io/elm-tooling-cli/cli

      Version:
          %VERSION%

    `);
  });
});
