import * as fs from "fs";
import * as path from "path";

import { bold, dim, EXECUTABLE } from "./mixed";
import { isWindows, Tool } from "./parse";

export function linkTool(
  nodeModulesBinPath: string,
  tool: Tool
): string | Error {
  const linkPath = path.join(nodeModulesBinPath, tool.name);

  // Just like npm, these overwrite whatever links are already in
  // `node_modules/.bin/`. Most likely it’s either old links from for example
  // the `elm` npm package, or links from previous runs of this script.
  const [linkPathPresentationString, what] = isWindows
    ? // istanbul ignore next
      [symlinkShimWindows(tool, linkPath), "shims"]
    : [symlink(tool, linkPath), "link"];

  if (linkPathPresentationString instanceof Error) {
    return new Error(linkPathPresentationString.message);
  }

  if (linkPathPresentationString === undefined) {
    return `${bold(`${tool.name} ${tool.version}`)} ${what}: ${dim(
      "all good"
    )}`;
  }

  return `${bold(`${tool.name} ${tool.version}`)} ${what} created: ${dim(
    `${linkPathPresentationString} -> ${tool.absolutePath}`
  )}`;
}

function symlink(tool: Tool, linkPath: string): string | Error | undefined {
  try {
    if (fs.readlinkSync(linkPath) === tool.absolutePath) {
      return undefined;
    }
  } catch (_error) {
    // Continue below.
  }

  try {
    fs.unlinkSync(linkPath);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    if (error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old link for ${tool.name} at ${linkPath}:\n${error.message}`
      );
    }
  }

  try {
    fs.symlinkSync(tool.absolutePath, linkPath);
  } catch (errorAny) /* istanbul ignore next */ {
    const error = errorAny as Error & { code?: number };
    return new Error(
      `Failed to create link for ${tool.name} at ${linkPath}:\n${error.message}`
    );
  }

  return linkPath;
}

// istanbul ignore next
function symlinkShimWindows(
  tool: Tool,
  linkPath: string
): string | Error | undefined {
  const items = [
    [linkPath, makeShScript(tool.absolutePath)],
    [`${linkPath}.cmd`, makeCmdScript(tool.absolutePath)],
    [`${linkPath}.ps1`, makePs1Script(tool.absolutePath)],
  ];
  const linkPathPresentationString = `${linkPath}{,.cmd,.ps1}`;

  try {
    if (
      items.every(
        ([itemPath, content]) =>
          fs.readFileSync(itemPath, "utf8") === content &&
          fs.statSync(itemPath).mode.toString(8).endsWith(EXECUTABLE)
      )
    ) {
      return undefined;
    }
  } catch (_error) {
    // Continue below.
  }

  try {
    for (const [itemPath] of items) {
      fs.unlinkSync(itemPath);
    }
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    if (error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old shims for ${tool.name} at ${linkPathPresentationString}:\n${error.message}`
      );
    }
  }

  try {
    for (const [itemPath, content] of items) {
      fs.writeFileSync(itemPath, content);
      fs.chmodSync(itemPath, EXECUTABLE);
    }
  } catch (errorAny) {
    const error = errorAny as Error & { code?: number };
    return new Error(
      `Failed to create shims for ${tool.name} at ${linkPathPresentationString}:\n${error.message}`
    );
  }

  return linkPathPresentationString;
}

// Windows-style paths works fine, at least in Git bash.
export function makeShScript(toolAbsolutePath: string): string {
  return lf(`
#!/bin/sh
${toolAbsolutePath
  .split(/(')/)
  .map((segment) =>
    segment === "" ? "" : segment === "'" ? "\\'" : `'${segment}'`
  )
  .join("")} "$@"
`);
}

// Note: Paths on Windows cannot contain `"`.
export function makeCmdScript(toolAbsolutePath: string): string {
  return crlf(`
@ECHO off
"${toolAbsolutePath}" %*
`);
}

// The shebang is for PowerShell on unix: https://github.com/npm/cmd-shim/pull/34
export function makePs1Script(toolAbsolutePath: string): string {
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
