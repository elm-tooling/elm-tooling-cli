import * as path from "path";

import elmToolingCli from "../index";
import {
  clean,
  CursorWriteStream,
  MemoryWriteStream,
  RawReadStream,
  stringSnapshotSerializer,
} from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "tools");

async function toolsHelper(
  fixture: string,
  chars: Array<string>
): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new CursorWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["tools"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin: new RawReadStream(chars),
    stdout,
    stderr,
  });

  expect(stderr.content).toBe("");
  expect(exitCode).toBe(0);

  return clean(stdout.getOutput());
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("tools", () => {
  test("default cursor position when no tools", async () => {
    expect(await toolsHelper("empty-elm-tooling", ["test-exit"]))
      .toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/empty-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘▊⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
         
    `);
  });

  test("default cursor position when tools are provided", async () => {
    expect(await toolsHelper("some-elm-tooling", ["test-exit"]))
      .toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/some-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘⧙☒⧘⧙]⧘ 0.8.3
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘

      ⧙elm-json⧘
        ⧙[⧘⧙x⧘⧙]⧘ 0.2.8

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
         
    `);
  });

  test("moves cursor to the end on exit", async () => {
    const fixture = "empty-elm-tooling";
    const output = await toolsHelper(fixture, ["q"]);

    expect(output).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/tools/empty-elm-tooling/elm-tooling.json⧘

      ⧙elm⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.0⧘
        ⧙[⧘ ⧙]⧘ ⧙0.19.1⧘

      ⧙elm-format⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.1⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.2⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.3⧘
        ⧙[⧘ ⧙]⧘ ⧙0.8.4⧘

      ⧙elm-json⧘
        ⧙[⧘ ⧙]⧘ ⧙0.2.8⧘

      ⧙Up⧘/⧙Down⧘ to move
      ⧙Space⧘ to toggle
      ⧙Enter⧘ to save
         
      Nothing changed.
      ▊
    `);

    expect(await toolsHelper(fixture, ["\x03"])).toBe(output);
  });
});
