import elmToolingCli from "../index";
import {
  clean,
  CursorWriteStream,
  MemoryWriteStream,
  RawReadStream,
  stringSnapshotSerializer,
} from "./helpers";

async function toolsHelper(
  args: Array<string>,
  chars: Array<string>
): Promise<string> {
  const stdout = new CursorWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(args, {
    cwd: __dirname,
    env: {},
    stdin: new RawReadStream(chars),
    stdout,
    stderr,
  });

  expect(stderr.content).toBe("");
  expect(exitCode).toBe(0);

  return clean(stdout.lines.join("\n"));
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("tools", () => {
  test("first test", async () => {
    expect(await toolsHelper(["tools"], ["q"])).toMatchInlineSnapshot(`
      ⧘⧙/Users/lydell/src/elm-tooling.json/cli/elm-tooling.json⧘

      ⧘⧙elm⧘
        ⧘⧙[⧘ ⧘⧙]⧘ ⧘⧙0.19.0⧘
        ⧘⧙[⧘⧘⧙x⧘⧘⧙]⧘ 0.19.1

      ⧘⧙elm-format⧘
        ⧘⧙[⧘ ⧘⧙]⧘ ⧘⧙0.8.1⧘
        ⧘⧙[⧘ ⧘⧙]⧘ ⧘⧙0.8.2⧘
        ⧘⧙[⧘ ⧘⧙]⧘ ⧘⧙0.8.3⧘
        ⧘⧙[⧘⧘⧙x⧘⧘⧙]⧘ 0.8.4

      ⧘⧙elm-json⧘
        ⧘⧙[⧘⧘⧙x⧘⧘⧙]⧘ 0.2.8

      ⧘⧙Up⧘/⧘⧙Down⧘ to move
      ⧘⧙Space⧘ to toggle
      ⧘⧙Enter⧘ to save
         
      Nothing changed.

    `);
  });
});
