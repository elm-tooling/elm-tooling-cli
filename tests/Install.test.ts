import * as fs from "fs";
import * as path from "path";

import elmToolingCli from "../src";
import type { Env } from "../src/Helpers";
import {
  assertExitCode,
  clean,
  duoStream,
  FailReadStream,
  IS_WINDOWS,
  MemoryWriteStream,
  readFile,
  stringSnapshotSerializer,
} from "./Helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "install");

function cleanInstall(string: string): string {
  return (
    string
      // Remove Windows differences.
      .replace(/shims?/g, "link")
      .replace(/\{[.,\w]+\}/g, "")
      // Fails with EISDIR on Linux, but EPERM on Mac.
      .replace(/(EPERM|EISDIR):.*/g, "EISDIR: fake error")
  );
}

async function installSuccessHelper(
  fixture: string,
  env?: Env,
  cwdExtensionRelativeToFixtureDir?: string
): Promise<{ stdout: string; bin: string; cwd: string }> {
  const dir = path.join(FIXTURES_DIR, fixture);
  const cwd =
    cwdExtensionRelativeToFixtureDir === undefined
      ? dir
      : path.join(dir, cwdExtensionRelativeToFixtureDir);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["install"], {
    cwd,
    env: { ELM_HOME: dir, ...env },
    stdin: new FailReadStream(),
    stdout,
    stderr,
  });

  assertExitCode(0, exitCode, stdout.content, stderr.content);
  expect(stderr.content).toBe("");

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
            ? `${entry.name}\n${readFile(path.join(binDir, entry.name)).replace(
                /^/gm,
                "  "
              )}`
            : entry.name
        )
        .join("\n")
    : "(does not exist)";

  return { stdout: cleanInstall(clean(stdout.content)), bin: clean(bin), cwd };
}

async function installFailHelper(fixture: string): Promise<string> {
  return installFailHelperAbsolute(path.join(FIXTURES_DIR, fixture));
}

async function installFailHelperAbsolute(dir: string): Promise<string> {
  const { markedStream, unmarkedStream } = duoStream();

  const exitCode = await elmToolingCli(["install"], {
    cwd: dir,
    env: { ELM_HOME: dir },
    stdin: new FailReadStream(),
    stdout: markedStream,
    stderr: unmarkedStream,
  });

  assertExitCode(1, exitCode, unmarkedStream.content, "");

  return cleanInstall(clean(unmarkedStream.content));
}

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("install", () => {
  describe("nothing to do", () => {
    test("empty object two levels up", async () => {
      const { stdout, bin } = await installSuccessHelper(
        "empty-object-two-levels-up/one/two"
      );
      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/empty-object-two-levels-up/elm-tooling.json⧘
        The "tools" field is missing. To add tools: elm-tooling tools

      `);
      expect(bin).toMatchInlineSnapshot(`(does not exist)`);
    });

    test("empty tools field", async () => {
      const { stdout, bin } = await installSuccessHelper("empty-tools-field");
      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/empty-tools-field/elm-tooling.json⧘
        The "tools" field is empty. To add tools: elm-tooling tools

      `);
      expect(bin).toMatchInlineSnapshot(`(does not exist)`);
    });

    test("NO_ELM_TOOLING_INSTALL", async () => {
      const { stdout, bin } = await installSuccessHelper("would-download", {
        NO_ELM_TOOLING_INSTALL: "",
      });
      expect(stdout).toMatchInlineSnapshot(``);
      expect(bin).toMatchInlineSnapshot(`(does not exist)`);
    });
  });

  describe("invalid", () => {
    test("unknown fields", async () => {
      expect(await installFailHelper("unknown-fields")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/unknown-fields/elm-tooling.json⧘

        ⧙2⧘ errors

        ⧙tols⧘
            Unknown field

        ⧙other 2⧘
            Unknown field

      `);
    });

    test("wrong tools type", async () => {
      expect(await installFailHelper("wrong-tools-type"))
        .toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/wrong-tools-type/elm-tooling.json⧘

        ⧙tools⧘
            Expected an object but got: ["elm","elm-format"]

      `);
    });

    test("unknown tools/versions", async () => {
      expect(await installFailHelper("unknown")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/unknown/elm-tooling.json⧘

        ⧙2⧘ errors

        ⧙tools["elm-compiler"]⧘
            Unknown tool
            Known tools: elm, elm-format, elm-json, elm-test-rs

        ⧙tools["elm-format"]⧘
            Unknown version: 0.8
            Known versions: 0.8.1, 0.8.2, 0.8.3, 0.8.4, 0.8.5, 0.8.6

      `);
    });
  });

  describe("errors", () => {
    test("not found", async () => {
      expect(await installFailHelperAbsolute(path.parse(__dirname).root))
        .toMatchInlineSnapshot(`
        No elm-tooling.json found. To create one: elm-tooling init

      `);
    });

    test("elm-tooling.json is folder", async () => {
      expect(await installFailHelper("is-folder")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/is-folder/elm-tooling.json⧘

        Failed to read file as JSON:
        EISDIR: fake error

      `);
    });

    test("bad json", async () => {
      expect(await installFailHelper("bad-json")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/bad-json/elm-tooling.json⧘

        Failed to read file as JSON:
        Unexpected end of JSON input

      `);
    });

    test("not an object", async () => {
      expect(await installFailHelper("not-an-object")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/not-an-object/elm-tooling.json⧘

        Expected an object but got: ["tools",{"elm":"0.19.1"}]

      `);
    });

    test("version is not a string", async () => {
      expect(await installFailHelper("version-is-not-string"))
        .toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/version-is-not-string/elm-tooling.json⧘

        ⧙tools["elm"]⧘
            Expected a version as a string but got: 1

      `);
    });

    test("node_modules/.bin is a file", async () => {
      expect(await installFailHelper("node_modules-bin-is-a-file"))
        .toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/node_modules-bin-is-a-file/elm-tooling.json⧘
        Failed to create /Users/you/project/fixtures/install/node_modules-bin-is-a-file/node_modules/.bin:
        EEXIST: file already exists, mkdir '/Users/you/project/fixtures/install/node_modules-bin-is-a-file/node_modules/.bin'

      `);
    });

    test("node_modules/.bin/elm is a folder", async () => {
      expect(await installFailHelper("executable-is-folder"))
        .toMatchInlineSnapshot(`
        ⟪⧙/Users/you/project/fixtures/install/executable-is-folder/elm-tooling.json⧘
        ⟫
        Failed to remove old link for elm at /Users/you/project/fixtures/install/executable-is-folder/node_modules/.bin/elm:
        EISDIR: fake error

      `);
    });

    test("~/.elm/elm-tooling/elm/0.19.1/elm is a folder", async () => {
      expect(await installFailHelper("executable-is-folder-in-elm-home"))
        .toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/install/executable-is-folder-in-elm-home/elm-tooling.json⧘

        ⧙tools["elm"]⧘
            Exists but is not a file: /Users/you/project/fixtures/install/executable-is-folder-in-elm-home/elm-tooling/elm/0.19.1/elm

      `);
    });
  });

  test("create/overwrite links", async () => {
    const fixture = "create-links";
    const binDir = path.join(FIXTURES_DIR, fixture, "node_modules", ".bin");
    const elmToolingJsonPath = path.join(
      FIXTURES_DIR,
      fixture,
      "elm-tooling.json"
    );
    const elmToolingJson = {
      tools: {
        elm: "0.19.1",
        "elm-format": "0.8.3",
      },
    };

    for (const item of fs.readdirSync(binDir)) {
      if (item !== "elmx") {
        fs.unlinkSync(path.join(binDir, item));
      }
    }
    if (IS_WINDOWS) {
      fs.writeFileSync(path.join(binDir, "elm"), "something else");
    } else {
      fs.symlinkSync("somewhere-else", path.join(binDir, "elm"));
    }

    // Missing "tools" field.
    fs.writeFileSync(elmToolingJsonPath, JSON.stringify({}));
    const { stdout, bin } = await installSuccessHelper(fixture);

    // Does not remove the `elm` link that was already there, but not made by
    // elm-tooling.
    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/install/create-links/elm-tooling.json⧘
      The "tools" field is missing. To add tools: elm-tooling tools

    `);

    if (IS_WINDOWS) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(bin).toMatchInlineSnapshot(`
        elm
          something else
        elmx
          not elm
          
      `);
    } else {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(bin).toMatchInlineSnapshot(`
        elm -> somewhere-else
        elmx
          not elm
          
      `);
    }

    fs.writeFileSync(elmToolingJsonPath, JSON.stringify(elmToolingJson));
    const { stdout: stdout1, bin: bin1 } = await installSuccessHelper(fixture);

    // Overwrites elm, creates elm-format.
    expect(stdout1).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/install/create-links/elm-tooling.json⧘
      ⧙elm 0.19.1⧘ link created: ⧙node_modules/.bin/elm -> /Users/you/project/fixtures/install/create-links/elm-tooling/elm/0.19.1/elm⧘
          To run: npx elm
      ⧙elm-format 0.8.3⧘ link created: ⧙node_modules/.bin/elm-format -> /Users/you/project/fixtures/install/create-links/elm-tooling/elm-format/0.8.3/elm-format⧘
          To run: npx elm-format

    `);

    if (IS_WINDOWS) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(bin1).toMatchInlineSnapshot(`
        elm
          #!/bin/sh
          '/Users/you/project/fixtures/install/create-links/elm-tooling/elm/0.19.1/elm' "$@"
          
        elm-format
          #!/bin/sh
          '/Users/you/project/fixtures/install/create-links/elm-tooling/elm-format/0.8.3/elm-format' "$@"
          
        elm-format.cmd
          @ECHO off
          "/Users/you/project/fixtures/install/create-links/elm-tooling/elm-format/0.8.3/elm-format" %*
          
        elm-format.ps1
          #!/usr/bin/env pwsh
          & '/Users/you/project/fixtures/install/create-links/elm-tooling/elm-format/0.8.3/elm-format' $args
          
        elm.cmd
          @ECHO off
          "/Users/you/project/fixtures/install/create-links/elm-tooling/elm/0.19.1/elm" %*
          
        elm.ps1
          #!/usr/bin/env pwsh
          & '/Users/you/project/fixtures/install/create-links/elm-tooling/elm/0.19.1/elm' $args
          
        elmx
          not elm
          
      `);
    } else {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(bin1).toMatchInlineSnapshot(`
        elm -> /Users/you/project/fixtures/install/create-links/elm-tooling/elm/0.19.1/elm
        elm-format -> /Users/you/project/fixtures/install/create-links/elm-tooling/elm-format/0.8.3/elm-format
        elmx
          not elm
          
      `);
    }

    const { stdout: stdout2, bin: bin2 } = await installSuccessHelper(fixture);

    // Detects that there’s nothing to do.
    expect(stdout2).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/install/create-links/elm-tooling.json⧘
      ⧙elm 0.19.1⧘: ⧙all good⧘
      ⧙elm-format 0.8.3⧘: ⧙all good⧘

    `);

    expect(bin2).toBe(bin1);

    fs.unlinkSync(path.join(binDir, "elm-format"));
    const {
      stdout: stdout3,
      bin: bin3,
      cwd,
    } = await installSuccessHelper(fixture, {}, "src");

    // Works from a subdirectory and handles a combination of already done and create.
    expect(stdout3).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/install/create-links/elm-tooling.json⧘
      ⧙elm 0.19.1⧘: ⧙all good⧘
      ⧙elm-format 0.8.3⧘ link created: ⧙/Users/you/project/fixtures/install/create-links/node_modules/.bin/elm-format -> /Users/you/project/fixtures/install/create-links/elm-tooling/elm-format/0.8.3/elm-format⧘
          To run: npx elm-format

    `);

    expect(bin3).toBe(bin1);

    expect(fs.readdirSync(path.join(cwd, "node_modules"))).toEqual([
      ".gitkeep",
    ]);

    // Empty "tools" field.
    fs.writeFileSync(elmToolingJsonPath, JSON.stringify({ tools: {} }));
    const { stdout: stdout4, bin: bin4 } = await installSuccessHelper(fixture);

    // Removes tools even if missing/empty "tools" field.
    expect(stdout4).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/install/create-links/elm-tooling.json⧘
      ⧙elm 0.19.1⧘ link removed: ⧙node_modules/.bin/elm⧘
      ⧙elm-format 0.8.3⧘ link removed: ⧙node_modules/.bin/elm-format⧘

    `);

    expect(bin4).toMatchInlineSnapshot(`
      elmx
        not elm
        
    `);

    const { stdout: stdout5, bin: bin5 } = await installSuccessHelper(fixture);

    // Nothing to do – print how to add tools.
    expect(stdout5).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/install/create-links/elm-tooling.json⧘
      The "tools" field is empty. To add tools: elm-tooling tools

    `);

    expect(bin5).toBe(bin4);
  });
});
