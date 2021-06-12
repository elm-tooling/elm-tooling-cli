import { makeCmdScript, makePs1Script, makeShScript } from "../src/Link";
import type { ToolPath } from "../src/PathHelpers";
import { stringSnapshotSerializer } from "./Helpers";

expect.addSnapshotSerializer(stringSnapshotSerializer);

function toolPath(thePath: string): ToolPath {
  return {
    tag: "ToolPath",
    theToolPath: {
      tag: "AbsolutePath",
      absolutePath: thePath,
    },
  };
}

describe("Windows scripts", () => {
  test("cmd script", () => {
    expect(makeCmdScript(toolPath("C:\\Users\\'complicated''stuff'")))
      .toMatchInlineSnapshot(`
      @ECHO off
      "C:\\Users\\'complicated''stuff'" %*

    `);
  });

  test("ps1 script", () => {
    expect(makePs1Script(toolPath("C:\\Users\\'complicated''stuff'")))
      .toMatchInlineSnapshot(`
      #!/usr/bin/env pwsh
      & 'C:\\Users\\''complicated''''stuff''' $args

    `);
  });

  test("sh script", () => {
    expect(makeShScript(toolPath("C:\\Users\\'complicated''stuff'")))
      .toMatchInlineSnapshot(`
      #!/bin/sh
      'C:\\Users\\'\\''complicated'\\'\\''stuff'\\' "$@"

    `);
  });
});
