import * as fs from "fs";
import * as path from "path";

import type { Env } from "../helpers/mixed";
import elmToolingCli from "../index";
import {
  clean,
  duoStream,
  FailReadStream,
  IS_WINDOWS,
  MemoryWriteStream,
  stringSnapshotSerializer,
} from "./helpers";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "download");

function cleanInstall(string: string): string {
  return (
    string
      // Remove Windows differences.
      .replace(/shims/g, "link")
      .replace(/\{[^.,\w]+\}/g, "")
      // Fails with EISDIR on Linux, but EPERM on Mac.
      .replace(/(EPERM|EISDIR):.*/g, "EISDIR: fake error")
  );
}

async function installSuccessHelper(
  fixture: string,
  env?: Env
): Promise<{ stdout: string; bin: string }> {
  const dir = path.join(FIXTURES_DIR, fixture);

  const stdout = new MemoryWriteStream();
  const stderr = new MemoryWriteStream();

  const exitCode = await elmToolingCli(["install"], {
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

  return { stdout: cleanInstall(clean(stdout.content)), bin: clean(bin) };
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

  expect(exitCode).toBe(1);

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
        ⧙/Users/you/project/fixtures/download/empty-object-two-levels-up/elm-tooling.json⧘
        The "tools" field is missing. To add tools: elm-tooling tools

      `);
      expect(bin).toMatchInlineSnapshot(`(does not exist)`);
    });

    test("empty tools field", async () => {
      const { stdout, bin } = await installSuccessHelper("empty-tools-field");
      expect(stdout).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/download/empty-tools-field/elm-tooling.json⧘
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
    test("wrong field type (ignores errors for other fields)", async () => {
      expect(await installFailHelper("wrong-field-types"))
        .toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/download/wrong-field-types/elm-tooling.json⧘

        ⧙1⧘ error

        ⧙tools⧘
            Expected an object but got: ["elm","elm-format"]

        ⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

      `);
    });

    test("unknown tools/versions", async () => {
      expect(await installFailHelper("unknown")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/download/unknown/elm-tooling.json⧘

        ⧙2⧘ errors

        ⧙tools["elm-compiler"]⧘
            Unknown tool
            Known tools: elm, elm-format, elm-json

        ⧙tools["elm-format"]⧘
            Unknown version: 0.8
            Known versions: 0.8.1, 0.8.2, 0.8.3, 0.8.4

        ⧙Documentation:⧘
            https://github.com/lydell/elm-tooling.json

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
        ⧙/Users/you/project/fixtures/download/is-folder/elm-tooling.json⧘
        Failed to read file as JSON:
        EISDIR: fake error

      `);
    });

    test("bad json", async () => {
      expect(await installFailHelper("bad-json")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/download/bad-json/elm-tooling.json⧘
        Failed to read file as JSON:
        Unexpected end of JSON input

      `);
    });

    test("not an object", async () => {
      expect(await installFailHelper("not-an-object")).toMatchInlineSnapshot(`
        ⧙/Users/you/project/fixtures/download/not-an-object/elm-tooling.json⧘
        Expected an object but got: ["tools",{"elm":"0.19.1"}]

      `);
    });

    test("node_modules/.bin is a file", async () => {
      expect(await installFailHelper("node_modules-bin-is-a-file"))
        .toMatchInlineSnapshot(`
          Failed to create /Users/you/project/fixtures/download/node_modules-bin-is-a-file/node_modules/.bin:
          EEXIST: file already exists, mkdir '/Users/you/project/fixtures/download/node_modules-bin-is-a-file/node_modules/.bin'

        `);
    });

    test("node_modules/.bin/elm is a folder", async () => {
      expect(await installFailHelper("executable-is-folder"))
        .toMatchInlineSnapshot(`
        ⟪⧙/Users/you/project/fixtures/download/executable-is-folder/elm-tooling.json⧘
        ⟫
        ⧙1⧘ error

        Failed to remove old link for elm at /Users/you/project/fixtures/download/executable-is-folder/node_modules/.bin/elm:
        EISDIR: fake error

      `);
    });
  });

  test("create/overwrite links", async () => {
    const fixture = "create-links";
    const binDir = path.join(FIXTURES_DIR, fixture, "node_modules", ".bin");
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

    const { stdout, bin } = await installSuccessHelper(fixture);
    expect(stdout).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/download/create-links/elm-tooling.json⧘
      ⧙elm 0.19.1⧘ link created: ⧙node_modules/.bin -> /Users/you/project/fixtures/download/create-links/elm-tooling/elm/0.19.1/elm⧘
          To run: npx elm
      ⧙elm-format 0.8.3⧘ link created: ⧙node_modules/.bin -> /Users/you/project/fixtures/download/create-links/elm-tooling/elm-format/0.8.3/elm-format⧘
          To run: npx elm-format

    `);

    if (IS_WINDOWS) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(bin).toMatchInlineSnapshot(`
        elm
          #!/bin/sh
          '/Users/you/project/fixtures/download/create-links/elm-tooling/elm/0.19.1/elm' "$@"
          
        elm-format
          #!/bin/sh
          '/Users/you/project/fixtures/download/create-links/elm-tooling/elm-format/0.8.3/elm-format' "$@"
          
        elm-format.cmd
          @ECHO off
          
          "/Users/you/project/fixtures/download/create-links/elm-tooling/elm-format/0.8.3/elm-format" %*
          
          
        elm-format.ps1
          #!/usr/bin/env pwsh
          & '/Users/you/project/fixtures/download/create-links/elm-tooling/elm-format/0.8.3/elm-format' $args
          
        elm.cmd
          @ECHO off
          
          "/Users/you/project/fixtures/download/create-links/elm-tooling/elm/0.19.1/elm" %*
          
          
        elm.ps1
          #!/usr/bin/env pwsh
          & '/Users/you/project/fixtures/download/create-links/elm-tooling/elm/0.19.1/elm' $args
          
        elmx
          not elm
          
      `);
    } else {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(bin).toMatchInlineSnapshot(`
        elm -> /Users/you/project/fixtures/download/create-links/elm-tooling/elm/0.19.1/elm
        elm-format -> /Users/you/project/fixtures/download/create-links/elm-tooling/elm-format/0.8.3/elm-format
        elmx
          not elm
          
      `);
    }

    const { stdout: stdout2, bin: bin2 } = await installSuccessHelper(fixture);

    expect(stdout2).toMatchInlineSnapshot(`
      ⧙/Users/you/project/fixtures/download/create-links/elm-tooling.json⧘
      ⧙elm 0.19.1⧘: ⧙all good⧘
      ⧙elm-format 0.8.3⧘: ⧙all good⧘

    `);

    expect(bin2).toBe(bin);
  });
});
