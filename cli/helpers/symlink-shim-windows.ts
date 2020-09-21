// Inspired by: https://github.com/npm/cmd-shim/blob/92c0a16d3c8a8c53ade76b5eae8efae01dd7f41f/index.js

import * as fs from "fs";

import { EXECUTABLE } from "./mixed";
import type { Tool } from "./parse";

// istanbul ignore next
export function symlinkShimWindows(
  tool: Tool,
  linkPath: string
): string | Error {
  const shLinkPath = linkPath;
  const cmdLinkPath = `${linkPath}.cmd`;
  const ps1LinkPath = `${linkPath}.ps1`;
  const linkPathPresentationString = `${linkPath}{,.cmd,.ps1}`;

  const shScript = makeShScript(tool.absolutePath);
  const cmdScript = makeCmdScript(tool.absolutePath);
  const ps1Script = makePs1Script(tool.absolutePath);

  try {
    fs.unlinkSync(shLinkPath);
    fs.unlinkSync(cmdLinkPath);
    fs.unlinkSync(ps1LinkPath);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    if (error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old links for ${tool.name} at ${linkPathPresentationString}:\n${error.message}`
      );
    }
  }

  try {
    fs.writeFileSync(shLinkPath, shScript);
    fs.chmodSync(shLinkPath, EXECUTABLE);
    fs.writeFileSync(cmdLinkPath, cmdScript);
    fs.chmodSync(cmdLinkPath, EXECUTABLE);
    fs.writeFileSync(ps1LinkPath, ps1Script);
    fs.chmodSync(ps1LinkPath, EXECUTABLE);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: number };
    return new Error(
      `Failed to create links for ${tool.name} at ${linkPathPresentationString}:\n${error.message}`
    );
  }

  return linkPathPresentationString;
}

// Windows-style paths works fine, at least in Git bash.
function makeShScript(toolAbsolutePath: string): string {
  return lf(`
#!/bin/sh
'${toolAbsolutePath.replace(/'/g, "'\\''")}' "$@"
`);
}

// Note: Paths on Windows cannot contain `"`.
function makeCmdScript(toolAbsolutePath: string): string {
  return crlf(`
@ECHO off
"${toolAbsolutePath}" %*
`);
}

// The shebang is for PowerShell on unix: https://github.com/npm/cmd-shim/pull/34
function makePs1Script(toolAbsolutePath: string): string {
  return lf(`
#!/usr/bin/env pwsh
& '${toolAbsolutePath.replace(/'/g, "''")}' $args
`);
}

function lf(string: string): string {
  return `${string.trim()}\n`;
}

function crlf(string: string): string {
  return lf(string).replace(/\n/g, "\r\n");
}
