import * as fs from "fs";
import * as path from "path";

import {
  bold,
  dim,
  EXECUTABLE,
  findClosest,
  NonEmptyArray,
} from "../helpers/mixed";
import { isWindows, Tool } from "../helpers/parse";
import download from "./download";

export default async function postinstall(): Promise<number> {
  if ("NO_ELM_TOOLING_POSTINSTALL" in process.env) {
    return 0;
  }

  const result = await download();

  switch (result.tag) {
    case "Exit":
      return result.statusCode;
    case "Success":
      return linkTools(result.tools);
  }
}

function linkTools(tools: NonEmptyArray<Tool>): number {
  const nodeModulesPath = findClosest("node_modules");
  if (nodeModulesPath === undefined) {
    console.error(
      "No node_modules/ folder found. Install your npm dependencies before running this script."
    );
    return 1;
  }

  const nodeModulesBinPath = path.join(nodeModulesPath, ".bin");
  try {
    fs.mkdirSync(nodeModulesBinPath, { recursive: true });
  } catch (errorAny) {
    const error = errorAny as Error & { code?: number };
    console.error(`Failed to create ${nodeModulesBinPath}:\n${error.message}`);
  }

  for (const tool of tools) {
    const linkPath = path.join(nodeModulesBinPath, tool.name);

    // Just like npm, these overwrite whatever links are already in
    // `node_modules/.bin/`. Most likely it’s either old links from for example
    // the `elm` npm package, or links from previous runs of this script.
    const linkPathPresentationString = isWindows
      ? symlinkShimWindows(tool, linkPath)
      : symlink(tool, linkPath);

    if (linkPathPresentationString instanceof Error) {
      console.error(linkPathPresentationString.message);
      return 1;
    }

    const s = linkPath === linkPathPresentationString ? "" : "s";
    console.log(
      `${bold(`${tool.name} ${tool.version}`)} link${s} created: ${dim(
        `${linkPathPresentationString} -> ${tool.absolutePath}`
      )}`
    );
  }

  return 0;
}

function symlink(tool: Tool, linkPath: string): string | Error {
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
  } catch (errorAny) {
    const error = errorAny as Error & { code?: number };
    return new Error(
      `Failed to create link for ${tool.name} at ${linkPath}:\n${error.message}`
    );
  }

  return linkPath;
}

// Inspired by: https://github.com/npm/cmd-shim/blob/92c0a16d3c8a8c53ade76b5eae8efae01dd7f41f/index.js
function symlinkShimWindows(tool: Tool, linkPath: string): string | Error {
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

// TODO: Need to convert path to unix style? cygpath?
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

// TODO: Escaping? exit $LASTEXITCODE needed?
function makePs1Script(toolAbsolutePath: string): string {
  return lf(`
#!/usr/bin/env pwsh
& '${toolAbsolutePath.replace(/'/g, "''")}' $args
exit $LASTEXITCODE
`);
}

function lf(string: string): string {
  return `${string.trim()}\n`;
}

function crlf(string: string): string {
  return lf(string).replace(/\n/g, "\r\n");
}
