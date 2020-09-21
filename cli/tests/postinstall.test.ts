/* eslint-disable jest/no-conditional-expect */

import * as fs from "fs";
import * as path from "path";

import type { Env } from "../helpers/mixed";
import elmToolingCli from "../index";
import {
  clean,
  FailReadStream,
  IS_WINDOWS,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "postinstall");

async function postinstallSuccessHelper(
  fixture: string,
  env?: Env
): Promise<{ stdout: string; bin: string }> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["postinstall"], {
    cwd: dir,
    env: { ELM_HOME: dir, ...env },
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  expect(stderr.content).toBe("");
  expect(exitCode).toBe(0);

  const binDir = path.join(dir, "node_modules", ".bin");
  const bin = fs.existsSync(binDir)
    ? fs
        .readdirSync(binDir, {
          withFileTypes: true,
        })
        .map((entry) =>
          entry.isSymbolicLink()
            ? `${entry.name} -> ${fs.readlinkSync(
                path.join(binDir, entry.name)
              )}`
            : entry.isFile()
            ? `${entry.name}\n${fs
                .readFileSync(path.join(binDir, entry.name), "utf8")
                .replace(/^/gm, "  ")}`
            : entry.name
        )
        .join("\n")
    : "(does not exist)";

  return { stdout: clean(stdout.content), bin: clean(bin) };
}

async function postinstallFailHelper(fixture: string): Promise<string> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["postinstall"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  // There will be some logging from download.
  expect(stdout.content).not.toBe("");
  expect(exitCode).toBe(1);

  return clean(stderr.content);
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("postinstall", () => {
  test("nothing to do (empty tools field)", async () => {
    const { stdout, bin } = await postinstallSuccessHelper("empty-tools-field");
    expect(stdout).toMatchInlineSnapshot(`
        ⧘⧙/Users/you/project/fixtures/postinstall/empty-tools-field/elm-tooling.json⧘
        The "tools" field is empty. Nothing to download.

      `);
    expect(bin).toMatchInlineSnapshot(`(does not exist)`);
  });

  test("nothing to do (NO_ELM_TOOLING_POSTINSTALL)", async () => {
    const { stdout, bin } = await postinstallSuccessHelper("would-download", {
      NO_ELM_TOOLING_POSTINSTALL: "",
    });
    expect(stdout).toMatchInlineSnapshot(``);
    expect(bin).toMatchInlineSnapshot(`(does not exist)`);
  });

  test("node_modules/.bin is a file", async () => {
    expect(await postinstallFailHelper("node_modules-bin-is-a-file"))
      .toMatchInlineSnapshot(`
      Failed to create /Users/you/project/fixtures/postinstall/node_modules-bin-is-a-file/node_modules/.bin:
      EEXIST: file already exists, mkdir '/Users/you/project/fixtures/postinstall/node_modules-bin-is-a-file/node_modules/.bin'

    `);
  });

  test("node_modules/.bin/elm is a folder", async () => {
    // Fails with EISDIR on Linux, but EPERM on mac.
    expect(
      (await postinstallFailHelper("binary-is-folder")).split("\n")[0]
    ).toMatchInlineSnapshot(
      `Failed to remove old link for elm at /Users/you/project/fixtures/postinstall/binary-is-folder/node_modules/.bin/elm:`
    );
  });

  test("create and overwrite", async () => {
    const fixture = "create";
    const binDir = path.join(FIXTURES_DIR, fixture, "node_modules", ".bin");
    for (const item of fs.readdirSync(binDir)) {
      if (item !== "elmx") {
        fs.unlinkSync(path.join(binDir, item));
      }
    }

    const { stdout, bin } = await postinstallSuccessHelper(fixture);
    expect(stdout).toMatchInlineSnapshot(`
      ⧘⧙/Users/you/project/fixtures/postinstall/create/elm-tooling.json⧘
      ⧘⧙elm 0.19.1⧘ already exists: ⧘⧙/Users/you/project/fixtures/postinstall/create/elm-tooling/elm/0.19.1/elm⧘
      ⧘⧙elm-format 0.8.3⧘ already exists: ⧘⧙/Users/you/project/fixtures/postinstall/create/elm-tooling/elm-format/0.8.3/elm-format⧘
      ⧘⧙elm 0.19.1⧘ link created: ⧘⧙/Users/you/project/fixtures/postinstall/create/node_modules/.bin/elm -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm/0.19.1/elm⧘
      ⧘⧙elm-format 0.8.3⧘ link created: ⧘⧙/Users/you/project/fixtures/postinstall/create/node_modules/.bin/elm-format -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm-format/0.8.3/elm-format⧘

    `);
    if (IS_WINDOWS) {
      expect(bin).toMatchInlineSnapshot();
    } else {
      expect(bin).toMatchInlineSnapshot(`
        elm -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm/0.19.1/elm
        elm-format -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm-format/0.8.3/elm-format
        elmx
          not elm
          
      `);
    }

    const { stdout: stdout2, bin: bin2 } = await postinstallSuccessHelper(
      fixture
    );
    expect(stdout2).toMatchInlineSnapshot(`
      ⧘⧙/Users/you/project/fixtures/postinstall/create/elm-tooling.json⧘
      ⧘⧙elm 0.19.1⧘ already exists: ⧘⧙/Users/you/project/fixtures/postinstall/create/elm-tooling/elm/0.19.1/elm⧘
      ⧘⧙elm-format 0.8.3⧘ already exists: ⧘⧙/Users/you/project/fixtures/postinstall/create/elm-tooling/elm-format/0.8.3/elm-format⧘
      ⧘⧙elm 0.19.1⧘ link created: ⧘⧙/Users/you/project/fixtures/postinstall/create/node_modules/.bin/elm -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm/0.19.1/elm⧘
      ⧘⧙elm-format 0.8.3⧘ link created: ⧘⧙/Users/you/project/fixtures/postinstall/create/node_modules/.bin/elm-format -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm-format/0.8.3/elm-format⧘

    `);
    if (IS_WINDOWS) {
      expect(bin2).toMatchInlineSnapshot();
    } else {
      expect(bin2).toMatchInlineSnapshot(`
        elm -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm/0.19.1/elm
        elm-format -> /Users/you/project/fixtures/postinstall/create/elm-tooling/elm-format/0.8.3/elm-format
        elmx
          not elm
          
      `);
    }
  });
});
