import {
  makeCmdScript,
  makePs1Script,
  makeShScript,
} from "../commands/install";
import { stringSnapshotSerializer } from "./helpers";

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("Windows scripts", () => {
  test("cmd script", () => {
    expect(makeCmdScript("C:\\Users\\'complicated''stuff'"))
      .toMatchInlineSnapshot(`
      @ECHO off
      "C:\\Users\\'complicated''stuff'" %*

    `);
  });

  test("ps1 script", () => {
    expect(makePs1Script("C:\\Users\\'complicated''stuff'"))
      .toMatchInlineSnapshot(`
      #!/usr/bin/env pwsh
      & 'C:\\Users\\''complicated''''stuff''' $args

    `);
  });

  test("sh script", () => {
    expect(makeShScript("C:\\Users\\'complicated''stuff'"))
      .toMatchInlineSnapshot(`
      #!/bin/sh
      'C:\\Users\\'\\''complicated'\\'\\''stuff'\\' "$@"

    `);
  });
});
